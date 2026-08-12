import re

from loguru import logger

from module.database import Database, engine
from module.downloader import DownloadClient
from module.models import Bangumi, ResponseModel, RSSItem, Torrent
from module.network import RequestContent
from module.utils.multi_version_filter import filter_multi_version_torrents


class RSSEngine(Database):
    def __init__(self, _engine=engine):
        super().__init__(_engine)

    @staticmethod
    async def _get_torrents(rss: RSSItem) -> list[Torrent]:
        async with RequestContent() as req:
            torrents = await req.get_torrents(rss.url)
            # Add RSS ID
            for torrent in torrents:
                torrent.rss_id = rss.id
        return torrents

    async def get_rss_torrents(self, rss_id: int) -> list[Torrent]:
        rss = await self.rss.search_id(rss_id)
        if rss:
            return await self.torrent.search_rss(rss_id)
        else:
            return []

    async def add_rss(
        self,
        rss_link: str,
        name: str | None = None,
        aggregate: bool = True,
        parser: str = "mikan",
    ):
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
            return ResponseModel(
                status=True,
                status_code=200,
                msg_en="RSS added successfully.",
                msg_zh="RSS 添加成功。",
            )
        else:
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en="RSS added failed.",
                msg_zh="RSS 添加失败。",
            )

    async def disable_list(self, rss_id_list: list[int]):
        for rss_id in rss_id_list:
            await self.rss.disable(rss_id)
        return ResponseModel(
            status=True,
            status_code=200,
            msg_en="Disable RSS successfully.",
            msg_zh="禁用 RSS 成功。",
        )

    async def enable_list(self, rss_id_list: list[int]):
        for rss_id in rss_id_list:
            await self.rss.enable(rss_id)
        return ResponseModel(
            status=True,
            status_code=200,
            msg_en="Enable RSS successfully.",
            msg_zh="启用 RSS 成功。",
        )

    async def delete_list(self, rss_id_list: list[int]):
        for rss_id in rss_id_list:
            await self.rss.delete(rss_id)
        return ResponseModel(
            status=True,
            status_code=200,
            msg_en="Delete RSS successfully.",
            msg_zh="删除 RSS 成功。",
        )

    async def pull_rss(self, rss_item: RSSItem) -> list[Torrent]:
        torrents = await self._get_torrents(rss_item)
        new_torrents = await self.torrent.check_new(torrents)
        return new_torrents

    async def match_torrent(self, torrent: Torrent) -> Bangumi | None:
        matched: Bangumi | None = await self.bangumi.match_torrent(torrent.name)
        if matched:
            if matched.filter == "":
                return matched
            _filter = matched.filter.replace(",", "|")
            if not re.search(_filter, torrent.name, re.IGNORECASE):
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
        from .analyser import RSSAnalyser

        analyser = RSSAnalyser()
        new_data = await analyser.torrents_to_data(torrents_to_add, rss_item)
        if new_data:
            await self.bangumi.add_all(new_data)
        return torrents

    async def fetch_regular_rss(self, rss_item: RSSItem) -> list[Torrent]:
        bangumi = (await self.bangumi.search_rss(rss_item.url))[0]
        async with RequestContent() as req:
            torrents = await req.get_torrents(
                rss_item.url, bangumi.filter.replace(",", "|")
            )
        return torrents

    async def refresh_rss(self, client: DownloadClient, rss_id: int | None = None):
        # Get All RSS Items
        if not rss_id:
            rss_items: list[RSSItem] = await self.rss.search_active()
        else:
            rss_item = await self.rss.search_id(rss_id)
            rss_items = [rss_item] if rss_item else []
        # From RSS Items, get all torrents
        logger.debug(f"[Engine] Get {len(rss_items)} RSS items")
        for rss_item in rss_items:
            if rss_item.aggregate:
                torrents = await self.fetch_aggregate_rss(rss_item)
            else:
                torrents = await self.fetch_regular_rss(rss_item)
            filter_multi_version_torrents(torrents)
            new_torrents = await self.torrent.check_new(torrents)
            # Get all enabled bangumi data
            for torrent in new_torrents:
                torrent.rss_id = rss_item.id
                matched_data = await self.match_torrent(torrent)
                if matched_data:
                    if await client.add_torrent(torrent, matched_data):
                        logger.debug(f"[Engine] Add torrent {torrent.name} to client")
            # Add all torrents to database
            await self.torrent.add_all(new_torrents)

    async def download_bangumi(self, bangumi: Bangumi):
        async with RequestContent() as req:
            torrents = await req.get_torrents(
                bangumi.rss_link, bangumi.filter.replace(",", "|")
            )
            if torrents:
                async with DownloadClient() as client:
                    await client.add_torrent(torrents, bangumi)
                    await self.torrent.add_all(torrents)
                    return ResponseModel(
                        status=True,
                        status_code=200,
                        msg_en=f"[Engine] Download {bangumi.official_title} successfully.",
                        msg_zh=f"下载 {bangumi.official_title} 成功。",
                    )
            else:
                return ResponseModel(
                    status=False,
                    status_code=406,
                    msg_en=f"[Engine] Download {bangumi.official_title} failed.",
                    msg_zh=f"[Engine] 下载 {bangumi.official_title} 失败。",
                )
