from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.bangumi import BangumiDatabase
from module.database.rss import RSSDatabase
from module.database.torrent import TorrentDatabase
from module.downloader import DownloadClient
from module.models import Bangumi, ResponseModel, RSSItem
from module.searcher import SEARCH_KEY, SearchTorrent
from module.service._locks import rss_operation_lock
from module.utils.torrent_tags import RENAME_TAG, format_offset_tag
from module.utils.torrent_versions import filter_superseded_torrents


class SeasonService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.bangumi = BangumiDatabase(session)
        self.rss = RSSDatabase(session)
        self.torrent = TorrentDatabase(session)

    async def collect_season(self, bangumi: Bangumi, link: str) -> ResponseModel:
        logger.info(
            "Start collecting {} Season {}...", bangumi.official_title, bangumi.season
        )
        title = bangumi.official_title
        season = bangumi.season
        async with SearchTorrent() as st, DownloadClient() as client:
            torrents = await st.get_torrents(link, bangumi.filter.replace(",", "|"))
            torrents = filter_superseded_torrents(torrents)
            offset_tag = format_offset_tag(bangumi.offset)
            tags = [RENAME_TAG, offset_tag] if offset_tag else None
            if await client.add_torrent(torrents, bangumi, tags=tags):
                logger.info("Collections of {} Season {} completed.", title, season)
                return ResponseModel(
                    status=True,
                    status_code=200,
                    msg_en=f"Collections of {title} Season {season} completed.",
                    msg_zh=f"收集 {title} 第 {season} 季完成。",
                )
            logger.warning("Already collected {} Season {}.", title, season)
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en=f"Collection of {title} Season {season} failed.",
                msg_zh=f"收集 {title} 第 {season} 季失败, 种子已经添加。",
            )

    async def subscribe_season(self, data: Bangumi, rss_item: RSSItem) -> ResponseModel:
        data.added = True
        data.eps_collect = True
        async with SearchTorrent() as search:
            torrents = await search.get_torrents(
                data.rss_link, data.filter.replace(",", "|")
            )
            for torrent in torrents:
                bangumi = await search.raw_parser(raw=torrent.name)
                if bangumi:
                    for field in SEARCH_KEY:
                        setattr(data, field, getattr(bangumi, field))
                    break

        torrents = filter_superseded_torrents(torrents)
        rss_item.name = rss_item.name or data.official_title
        rss_item.enabled = True
        await self.rss.add(rss_item)
        await self.bangumi.add(data)
        await self.session.commit()

        if torrents:
            for torrent in torrents:
                torrent.rss_id = rss_item.id
            try:
                async with DownloadClient() as client:
                    await client.add_torrent(torrents, data)
            except Exception:
                logger.exception(
                    "RSS for {} was subscribed, but torrent download failed.",
                    data.official_title,
                )
            else:
                await self.torrent.add_all(torrents)
                await self.session.commit()

        return ResponseModel(
            status=True,
            status_code=200,
            msg_en=f"RSS for {data.official_title} was subscribed successfully.",
            msg_zh=f"已成功订阅 {data.official_title} 的 RSS。",
        )

    async def subscribe_existing(self, rss: RSSItem, bangumi_id: int) -> ResponseModel:
        bangumi = await self.bangumi.search_id(bangumi_id)
        if bangumi is None:
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en="The selected Bangumi rule no longer exists.",
                msg_zh="所选番剧规则已不存在。",
            )

        rss_item = RSSItem(
            url=rss.url,
            name=rss.name or bangumi.official_title,
            aggregate=False,
            parser=rss.parser,
        )
        await self.rss.add(rss_item)
        bangumi.rss_link = (
            f"{bangumi.rss_link},{rss.url}" if bangumi.rss_link else rss.url
        )
        bangumi.deleted = False
        self.bangumi.set_rss_link(bangumi, bangumi.rss_link)
        await self.session.commit()

        async with SearchTorrent() as search:
            torrents = await search.get_torrents(
                rss.url, bangumi.filter.replace(",", "|")
            )
        torrents = filter_superseded_torrents(torrents)
        if torrents:
            for torrent in torrents:
                torrent.rss_id = rss_item.id
                torrent.bangumi_id = bangumi.id
            try:
                async with DownloadClient() as client:
                    await client.add_torrent(torrents, bangumi)
            except Exception:
                logger.exception(
                    "RSS for {} was subscribed, but torrent download failed.",
                    bangumi.official_title,
                )
            else:
                await self.torrent.add_all(torrents)
                await self.session.commit()

        return ResponseModel(
            status=True,
            status_code=200,
            msg_en=f"RSS for {bangumi.official_title} was subscribed successfully.",
            msg_zh=f"已成功订阅 {bangumi.official_title} 的 RSS。",
        )

    async def force_collect(self, bangumi: Bangumi) -> ResponseModel:
        logger.info(
            "Force collecting {} Season {}...", bangumi.official_title, bangumi.season
        )
        rss_links = filter(None, bangumi.rss_link.split(","))

        async with SearchTorrent() as st, DownloadClient() as client:
            for rss_link in rss_links:
                rss = await self.rss.search_url(rss_link)
                if rss is None:
                    continue
                if rss.aggregate:
                    torrents = await st.search_season(bangumi)
                    break
                torrents = await st.get_torrents(
                    rss_link, bangumi.filter.replace(",", "|")
                )
                break
            else:
                return ResponseModel(
                    status=False,
                    status_code=406,
                    msg_en=f"Collection of {bangumi.official_title} Season {bangumi.season} failed, no valid rss found.",
                    msg_zh=f"收集 {bangumi.official_title} 第 {bangumi.season} 季失败, 未找到有效rss。",
                )
            torrents = filter_superseded_torrents(torrents)
            await client.add_torrent(torrents, bangumi)
            logger.info(
                "Collections of {} Season {} completed.",
                bangumi.official_title,
                bangumi.season,
            )
            await self.torrent.add_all(torrents)
            await self.session.commit()
            return ResponseModel(
                status=True,
                status_code=200,
                msg_en=f"Collections of {bangumi.official_title} Season {bangumi.season} completed.",
                msg_zh=f"收集 {bangumi.official_title} 第 {bangumi.season} 季完成。",
            )

    async def collect_incomplete(self) -> None:
        async with rss_operation_lock:
            datas = await self.bangumi.not_complete()
            if not datas:
                return
            logger.info("Start collecting full season...")
            try:
                async with SearchTorrent() as st, DownloadClient() as client:
                    for data in datas:
                        torrents = await st.search_season(data)
                        torrents = filter_superseded_torrents(torrents)
                        if not await client.add_torrent(torrents, data):
                            continue
                        data.eps_collect = True
                        self.session.add(data)
                        await self.torrent.add_all(torrents)
                        await self.session.commit()
                        logger.info(
                            "Collections of {} Season {} completed.",
                            data.official_title,
                            data.season,
                        )
            except Exception:
                await self.session.rollback()
                raise
