from pathlib import Path

from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from module.conf import POSTERS_PATH
from module.database.bangumi import BangumiDatabase
from module.database.rss import RSSDatabase
from module.database.torrent import TorrentDatabase
from module.downloader import DownloadClient
from module.models import Bangumi, ResponseModel
from module.parser import TitleParser
from module.service._locks import rss_operation_lock
from module.service.torrent import TorrentService
from module.utils.torrent_tags import format_offset_tag


class BangumiService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.bangumi = BangumiDatabase(session)
        self.rss = RSSDatabase(session)
        self.torrent = TorrentDatabase(session)

    async def search_all(self) -> list[Bangumi]:
        return await self.bangumi.search_all()

    async def delete_all(self) -> None:
        async with rss_operation_lock:
            await self.bangumi.delete_all()
            await self.session.commit()

    async def refresh_poster(self) -> ResponseModel:
        bangumis = await self.bangumi.search_all()
        parser = TitleParser()
        for bangumi in bangumis:
            if not bangumi.poster_link:
                await parser.tmdb_poster_parser(bangumi)
        await self.bangumi.update_all(bangumis)
        await self.session.commit()
        return ResponseModel(
            status_code=200,
            status=True,
            msg_en="Refresh poster link successfully.",
            msg_zh="刷新海报链接成功。",
        )

    async def refind_poster(self, bangumi_id: int) -> ResponseModel:
        bangumi = await self.bangumi.search_id(bangumi_id)
        if bangumi is None:
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find data with {bangumi_id}",
                msg_zh=f"无法找到 id {bangumi_id} 的数据",
            )
        await TitleParser().tmdb_poster_parser(bangumi)
        await self.bangumi.update(bangumi)
        await self.session.commit()
        return ResponseModel(
            status_code=200,
            status=True,
            msg_en="Refresh poster link successfully.",
            msg_zh="刷新海报链接成功。",
        )

    async def ensure_poster_cache(self) -> None:
        POSTERS_PATH.mkdir(parents=True, exist_ok=True)
        bangumis = await self.bangumi.search_all()
        changed = []
        parser = TitleParser()
        for bangumi in bangumis:
            if bangumi.poster_link and (Path("data") / bangumi.poster_link).exists():
                continue

            bangumi.poster_link = None
            if bangumi.id is not None:
                homepage = await self.torrent.get_homepage_by_bangumi_id(bangumi.id)
                if homepage is not None:
                    poster_link, _ = await parser.mikan_parser(homepage)
                    if poster_link:
                        bangumi.poster_link = poster_link

            if bangumi.poster_link is None:
                await parser.tmdb_poster_parser(bangumi)
            changed.append(bangumi)

        if changed:
            await self.bangumi.update_all(changed)
            await self.session.commit()

    async def delete_one(self, bangumi_id: int, file: bool = False) -> ResponseModel:
        async with rss_operation_lock:
            return await self._delete_one(bangumi_id, file)

    async def _delete_regular_rss(self, rss_urls: set[str]) -> None:
        for rss in await self.rss.search_urls(rss_urls):
            if rss.aggregate or rss.id is None:
                continue
            await self.rss.delete_one(rss.id)

    async def _delete_one(self, bangumi_id: int, file: bool = False) -> ResponseModel:
        data = await self.bangumi.search_id(bangumi_id)
        if not isinstance(data, Bangumi) or data.id is None:
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find id {bangumi_id}",
                msg_zh=f"无法找到 id {bangumi_id}",
            )

        official_title = data.official_title
        rss_urls = set(filter(None, (data.rss_link or "").split(",")))
        offset_tag = format_offset_tag(data.offset)
        try:
            hashes = await self.torrent.delete_by_bangumi_id(bangumi_id)
            await self.bangumi.delete_one(bangumi_id)
            await self._delete_regular_rss(rss_urls)
            if offset_tag and hashes:
                async with DownloadClient() as client:
                    await client.set_tag(hashes, offset_tag)
            await self.session.commit()
        except Exception as e:
            await self.session.rollback()
            logger.error("Delete rule {} failed. Because: {}", bangumi_id, e)
            return ResponseModel(
                status_code=500,
                status=False,
                msg_en=f"Failed to delete rule for {official_title}.",
                msg_zh=f"删除 {official_title} 规则失败。",
            )

        torrent_message = None
        if file:
            async with DownloadClient() as client:
                torrent_message = await TorrentService.delete_torrents(data, client)

        logger.info("[Service] Delete rule for {}", official_title)
        return ResponseModel(
            status_code=200,
            status=True,
            msg_en=f"Delete rule for {official_title}. {torrent_message.msg_en if torrent_message else ''}",
            msg_zh=f"删除 {official_title} 规则。{torrent_message.msg_zh if torrent_message else ''}",
        )
