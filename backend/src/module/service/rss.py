import re

from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.bangumi import BangumiDatabase
from module.database.rss import RSSDatabase
from module.database.torrent import TorrentDatabase
from module.downloader import DownloadClient
from module.models import Bangumi, ResponseModel, RSSItem, Torrent
from module.network import RequestContent
from module.rss.analyser import RSSAnalyser
from module.utils.multi_version_filter import filter_multi_version_torrents


class RssService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.rss = RSSDatabase(session)
        self.bangumi = BangumiDatabase(session)
        self.torrent = TorrentDatabase(session)

    async def match_torrent(self, torrent: Torrent) -> Bangumi | None:
        matched = await self.bangumi.match_torrent(torrent.name)
        if matched:
            if matched.filter == "":
                return matched
            torrent_filter = matched.filter.replace(",", "|")
            if not re.search(torrent_filter, torrent.name, re.IGNORECASE):
                torrent.bangumi_id = matched.id
                return matched
        return None

    async def fetch_aggregate_rss(self, rss_item: RSSItem) -> list[Torrent]:
        async with RequestContent() as req:
            torrents = await req.get_torrents(rss_item.url)
        torrents_to_add = await self.bangumi.match_list(torrents.copy(), rss_item.url)
        if not torrents_to_add:
            logger.debug("[RSS] No new title has been found.")
            return torrents
        new_data = await RSSAnalyser().torrents_to_data(torrents_to_add, rss_item)
        if new_data:
            await self.bangumi.add_all(new_data)
        return torrents

    async def fetch_regular_rss(self, rss_item: RSSItem) -> list[Torrent]:
        bangumi_list = await self.bangumi.search_rss(rss_item.url)
        if not bangumi_list:
            logger.warning(
                "[RSS] No association rule found for regular RSS {}.", rss_item.url
            )
            return []
        bangumi = bangumi_list[0]
        async with RequestContent() as req:
            return await req.get_torrents(
                rss_item.url, bangumi.filter.replace(",", "|")
            )

    async def refresh_rss(self, rss_id: int | None = None) -> None:
        async with DownloadClient() as client:
            if rss_id is None:
                rss_items = await self.rss.search_active()
            else:
                rss_item = await self.rss.search_id(rss_id)
                rss_items = [rss_item] if rss_item else []
            logger.debug("[RSS] Get {} RSS items", len(rss_items))
            for rss_item in rss_items:
                if rss_item.aggregate:
                    torrents = await self.fetch_aggregate_rss(rss_item)
                else:
                    torrents = await self.fetch_regular_rss(rss_item)
                filter_multi_version_torrents(torrents)
                new_torrents = await self.torrent.check_new(torrents)
                for torrent in new_torrents:
                    torrent.rss_id = rss_item.id
                    matched_data = await self.match_torrent(torrent)
                    if matched_data and await client.add_torrent(torrent, matched_data):
                        logger.debug("[RSS] Add torrent {} to client", torrent.name)
                await self.torrent.add_all(new_torrents)

    async def _delete_rss_and_cleanup_bangumi(self, rss_id: int) -> bool:
        rss_item = await self.rss.search_id(rss_id)
        if rss_item is None:
            return False

        for bangumi in await self.bangumi.search_rss(rss_item.url):
            members = [
                member
                for member in (bangumi.rss_link or "").split(",")
                if member and member != rss_item.url
            ]
            if members:
                self.bangumi.set_rss_link(bangumi, ",".join(members))
            elif bangumi.id is not None:
                await self.torrent.delete_by_bangumi_id(bangumi.id)
                if not await self.bangumi.delete_one(bangumi.id):
                    raise ValueError(
                        f"Bangumi rule {bangumi.id} disappeared during deletion"
                    )

        return await self.rss.delete_one(rss_id)

    async def delete_one(self, rss_id: int) -> ResponseModel:
        return await self.delete_many([rss_id])

    async def delete_many(self, rss_ids: list[int]) -> ResponseModel:
        try:
            for rss_id in set(rss_ids):
                if not await self._delete_rss_and_cleanup_bangumi(rss_id):
                    raise ValueError(f"RSS item {rss_id} does not exist")
            await self.session.commit()
        except Exception as e:
            await self.session.rollback()
            logger.error("Delete RSS Items failed. Because: {}", e)
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en="Delete RSS failed.",
                msg_zh="删除 RSS 失败。",
            )
        return ResponseModel(
            status=True,
            status_code=200,
            msg_en="Delete RSS successfully.",
            msg_zh="删除 RSS 成功。",
        )
