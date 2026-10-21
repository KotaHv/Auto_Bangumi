import re
from typing import cast

from loguru import logger
from sqlalchemy.exc import IntegrityError
from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.bangumi import BangumiDatabase
from module.database.bangumi_rss import BangumiRSSDatabase
from module.database.rss import RSSDatabase
from module.database.torrent import TorrentDatabase
from module.downloader import DownloadClient
from module.models import (
    Bangumi,
    BangumiData,
    ResponseModel,
    RSSAnalysisOption,
    RSSAnalysisResult,
    RSSItem,
    RSSUpdate,
    Torrent,
)
from module.network import RequestContent
from module.parser import TitleParser
from module.service._locks import rss_operation_lock
from module.utils.torrent_versions import filter_superseded_torrents


class RssService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.rss = RSSDatabase(session)
        self.bangumi = BangumiDatabase(session)
        self.bangumi_rss = BangumiRSSDatabase(session)
        self.torrent = TorrentDatabase(session)
        self.parser = TitleParser()

    async def search_all(self) -> list[RSSItem]:
        return await self.rss.search_all()

    async def pull_rss(self, rss_item: RSSItem) -> list[Torrent]:
        async with RequestContent() as req:
            torrents = await req.get_torrents(rss_item.url)
        for torrent in torrents:
            torrent.rss_id = rss_item.id
        return await self.torrent.check_new(torrents)

    async def add_rss(
        self,
        rss_link: str,
        name: str | None = None,
        aggregate: bool = True,
        parser: str = "mikan",
    ) -> ResponseModel:
        if await self.rss.search_url(rss_link) is not None:
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en="RSS already exists.",
                msg_zh="RSS 已存在。",
            )
        if not name:
            async with RequestContent() as req:
                name = await req.get_rss_title(rss_link)
                if not name:
                    return ResponseModel(
                        status=False,
                        status_code=406,
                        msg_en="Failed to get RSS title.",
                        msg_zh="无法获取 RSS 标题。",
                    )
        rss_data = RSSItem(name=name, url=rss_link, aggregate=aggregate, parser=parser)
        if await self.rss.add(rss_data):
            await self.session.commit()
            return ResponseModel(
                status=True,
                status_code=200,
                msg_en="RSS added successfully.",
                msg_zh="RSS 添加成功。",
            )
        return ResponseModel(
            status=False,
            status_code=406,
            msg_en="RSS already exists.",
            msg_zh="RSS 已存在。",
        )

    async def _first_bangumi_from_feed(
        self, rss_item: RSSItem
    ) -> Bangumi | ResponseModel:
        async with RequestContent() as req:
            torrents = await req.get_torrents(rss_item.url, "\\d+-\\d+")
        if not torrents:
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en="Cannot find any torrent.",
                msg_zh="无法找到种子。",
            )
        for torrent in torrents:
            bangumi = await self.parser.raw_parser(raw=torrent.name)
            if bangumi:
                await self.parser.official_title_parser(bangumi, rss_item, torrent)
                return bangumi
        return ResponseModel(
            status=False,
            status_code=406,
            msg_en="Cannot parse this link.",
            msg_zh="无法解析此链接。",
        )

    async def analyze_feed(
        self, rss_item: RSSItem
    ) -> RSSAnalysisResult | ResponseModel:
        if await self.rss.search_url(rss_item.url) is not None:
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en="RSS already exists.",
                msg_zh="RSS 已存在。",
            )

        data = await self._first_bangumi_from_feed(rss_item)
        if not isinstance(data, Bangumi):
            return data

        data.rss_items = [rss_item]
        return RSSAnalysisResult(options=await self.analysis_options(data))

    async def analysis_options(self, data: Bangumi) -> list[RSSAnalysisOption]:
        if data.season_raw:
            exact_match = await self.bangumi.find_for_rss_analysis(data)
            if exact_match is not None:
                return [
                    RSSAnalysisOption(
                        type="exact_match",
                        bangumi=BangumiData.from_bangumi(exact_match),
                    )
                ]

        candidates = await self.bangumi.find_by_official_or_raw_title(
            official_title=data.official_title,
            title_raw=data.title_raw,
        )
        options = [
            RSSAnalysisOption(
                type="candidate",
                bangumi=BangumiData.from_bangumi(rule),
            )
            for rule in candidates
        ]
        options.append(
            RSSAnalysisOption(type="create", bangumi=BangumiData.from_bangumi(data))
        )
        return options

    async def _filter_new_torrents(self, torrents: list[Torrent]) -> list[Torrent]:
        return await self.torrent.check_new(filter_superseded_torrents(torrents))

    async def refresh_aggregate_rss(
        self, rss_item: RSSItem, client: DownloadClient
    ) -> None:
        async with RequestContent() as req:
            torrents = await req.get_torrents(rss_item.url)
        for torrent in torrents:
            torrent.rss_id = rss_item.id

        new_torrents = await self._filter_new_torrents(torrents)
        bangumi_cache: dict[
            tuple[str, int, str | None], tuple[Bangumi, re.Pattern[str] | None]
        ] = {}
        for torrent in new_torrents:
            bangumi = await self.parser.raw_parser(raw=torrent.name)
            if bangumi is None:
                logger.warning(
                    "[RSS] Skip unparseable torrent {} from aggregate feed {}.",
                    torrent.name,
                    rss_item.url,
                )
                continue
            if not bangumi.title_raw:
                logger.warning(
                    "[RSS] Skip torrent {} with no parsed title from aggregate feed {}.",
                    torrent.name,
                    rss_item.url,
                )
                continue

            key = (bangumi.title_raw, bangumi.season, bangumi.group_name)
            if key not in bangumi_cache:
                matches = await self.bangumi.find_by_raw_title_season_group(*key)
                if matches:
                    bangumi = matches[0]
                    if rss_item not in bangumi.rss_items:
                        bangumi.rss_items.append(rss_item)
                        bangumi.added = False
                    bangumi.deleted = False
                    self.session.add(bangumi)
                else:
                    await self.parser.official_title_parser(bangumi, rss_item, torrent)
                    bangumi.rss_items.append(rss_item)
                    await self.bangumi.add(bangumi)

                torrent_filter = (
                    re.compile(bangumi.filter.replace(",", "|"), re.IGNORECASE)
                    if bangumi.filter
                    else None
                )
                bangumi_cache[key] = (bangumi, torrent_filter)

            bangumi, torrent_filter = bangumi_cache[key]
            torrent.bangumi_id = bangumi.id
            if torrent_filter is None or not torrent_filter.search(torrent.name):
                if await client.add_torrent(torrent, bangumi):
                    logger.debug("[RSS] Add torrent {} to client", torrent.name)

        await self.torrent.add_all(new_torrents)
        await self.session.commit()

    async def refresh_regular_rss(
        self, rss_item: RSSItem, client: DownloadClient
    ) -> None:
        bangumis = rss_item.bangumis
        if not bangumis:
            logger.warning(
                "[RSS] No association rule found for regular RSS {}.", rss_item.url
            )
            await self.session.commit()
            return

        bangumi = bangumis[0]
        if bangumi.deleted:
            logger.info(
                "[RSS] Skip regular RSS {} because its Bangumi rule is deleted.",
                rss_item.url,
            )
            return

        async with RequestContent() as req:
            torrents = await req.get_torrents(
                rss_item.url, bangumi.filter.replace(",", "|")
            )

        new_torrents = await self._filter_new_torrents(torrents)
        for torrent in new_torrents:
            torrent.rss_id = rss_item.id
            torrent.bangumi_id = bangumi.id
            if await client.add_torrent(torrent, bangumi):
                logger.debug("[RSS] Add torrent {} to client", torrent.name)

        await self.torrent.add_all(new_torrents)
        await self.session.commit()

    async def refresh_rss(self, rss_id: int | None = None) -> None:
        async with rss_operation_lock:
            try:
                async with DownloadClient() as client:
                    if rss_id is None:
                        rss_items = await self.rss.search_active_with_bangumis()
                    else:
                        rss_item = await self.rss.search_id_with_bangumis(rss_id)
                        rss_items = [rss_item] if rss_item else []
                    logger.debug("[RSS] Get {} RSS items", len(rss_items))
                    for rss_item in rss_items:
                        if rss_item.aggregate:
                            await self.refresh_aggregate_rss(rss_item, client)
                        else:
                            await self.refresh_regular_rss(rss_item, client)
            except Exception:
                await self.session.rollback()
                raise

    async def set_enabled_many(
        self, rss_ids: list[int], enabled: bool
    ) -> ResponseModel:
        action = "Enable" if enabled else "Disable"
        action_zh = "启用" if enabled else "禁用"
        try:
            if not await self.rss.set_enabled_many(rss_ids, enabled):
                await self.session.rollback()
                return ResponseModel(
                    status=False,
                    status_code=406,
                    msg_en=f"{action} RSS failed.",
                    msg_zh=f"{action_zh} RSS 失败。",
                )
            await self.session.commit()
            return ResponseModel(
                status=True,
                status_code=200,
                msg_en=f"{action} RSS successfully.",
                msg_zh=f"{action_zh} RSS 成功。",
            )
        except Exception as e:
            await self.session.rollback()
            logger.error("{} RSS failed. Because: {}", action, e)
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en=f"{action} RSS failed.",
                msg_zh=f"{action_zh} RSS 失败。",
            )

    async def set_enabled(self, rss_id: int, enabled: bool) -> bool:
        try:
            changed = (
                await self.rss.enable(rss_id)
                if enabled
                else await self.rss.disable(rss_id)
            )
            if not changed:
                await self.session.rollback()
                return False
            await self.session.commit()
            return True
        except Exception:
            await self.session.rollback()
            raise

    async def update(self, rss_id: int, data: RSSUpdate) -> bool:
        try:
            changed = await self.rss.update(rss_id, data)
            if not changed:
                await self.session.rollback()
                return False
            await self.session.commit()
            return True
        except IntegrityError:
            await self.session.rollback()
            return False
        except Exception:
            await self.session.rollback()
            raise

    async def _delete_rss_and_cleanup_bangumi(self, rss_id: int) -> bool:
        rss_item = await self.rss.search_id_with_bangumis(rss_id)
        if rss_item is None:
            return False

        for bangumi in rss_item.bangumis:
            bangumi_id = cast(int, bangumi.id)
            if len(bangumi.rss_items) > 1:
                await self.bangumi_rss.remove(bangumi_id, rss_id)
            else:
                await self.torrent.delete_by_bangumi_id(bangumi_id)
                if not await self.bangumi.delete_one(bangumi_id):
                    raise ValueError(
                        f"Bangumi rule {bangumi_id} disappeared during deletion"
                    )

        return await self.rss.delete_one(rss_id)

    async def delete_one(self, rss_id: int) -> ResponseModel:
        return await self.delete_many([rss_id])

    async def delete_many(self, rss_ids: list[int]) -> ResponseModel:
        async with rss_operation_lock:
            try:
                for rss_id in set(rss_ids):
                    if not await self._delete_rss_and_cleanup_bangumi(rss_id):
                        raise ValueError(f"RSS item {rss_id} does not exist")
                await self.session.commit()
                return ResponseModel(
                    status=True,
                    status_code=200,
                    msg_en="Delete RSS successfully.",
                    msg_zh="删除 RSS 成功。",
                )
            except Exception as e:
                await self.session.rollback()
                logger.error("Delete RSS Items failed. Because: {}", e)
                return ResponseModel(
                    status=False,
                    status_code=406,
                    msg_en="Delete RSS failed.",
                    msg_zh="删除 RSS 失败。",
                )
