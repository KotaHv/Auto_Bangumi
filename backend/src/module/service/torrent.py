from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.bangumi import BangumiDatabase
from module.database.rss import RSSDatabase
from module.downloader import DownloadClient
from module.models import Bangumi, BangumiUpdate, ResponseModel


class TorrentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.bangumi = BangumiDatabase(session)
        self.rss = RSSDatabase(session)

    @staticmethod
    async def match_torrents_list(data: Bangumi | BangumiUpdate) -> list[str]:
        async with DownloadClient() as client:
            torrents = await client.get_torrent_info(status_filter=None)
        return [
            torrent.hash
            for torrent in torrents
            if torrent.save_path == data.save_path and torrent.hash
        ]

    @staticmethod
    async def delete_torrents(data: Bangumi, client: DownloadClient) -> ResponseModel:
        hash_list = await TorrentService.match_torrents_list(data)
        if hash_list:
            await client.delete_torrent(hash_list)
            logger.info("Delete rule and torrents for {}", data.official_title)
            return ResponseModel(
                status_code=200,
                status=True,
                msg_en=f"Delete rule and torrents for {data.official_title}",
                msg_zh=f"删除 {data.official_title} 规则和种子",
            )
        return ResponseModel(
            status_code=406,
            status=False,
            msg_en=f"Can't find torrents for {data.official_title}",
            msg_zh=f"无法找到 {data.official_title} 的种子",
        )

    async def _set_rule_enabled(self, data: Bangumi, enabled: bool) -> None:
        rss_urls = set(filter(None, (data.rss_link or "").split(",")))
        try:
            data.deleted = not enabled
            self.session.add(data)
            for rss in await self.rss.search_urls(rss_urls):
                if not rss.aggregate:
                    rss.enabled = enabled
                    self.session.add(rss)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

    async def disable_rule(self, _id: int, file: bool = False) -> ResponseModel:
        data = await self.bangumi.search_id(_id)
        if not isinstance(data, Bangumi):
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find id {_id}",
                msg_zh=f"无法找到 id {_id}",
            )

        if file:
            async with DownloadClient() as client:
                await self._set_rule_enabled(data, enabled=False)
                return await self.delete_torrents(data, client)

        await self._set_rule_enabled(data, enabled=False)
        logger.info("Disable rule for {}", data.official_title)
        return ResponseModel(
            status_code=200,
            status=True,
            msg_en=f"Disable rule for {data.official_title}",
            msg_zh=f"禁用 {data.official_title} 规则",
        )

    async def enable_rule(self, _id: int) -> ResponseModel:
        data = await self.bangumi.search_id(_id)
        if not isinstance(data, Bangumi):
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find id {_id}",
                msg_zh=f"无法找到 id {_id}",
            )

        await self._set_rule_enabled(data, enabled=True)
        logger.info("Enable rule for {}", data.official_title)
        return ResponseModel(
            status_code=200,
            status=True,
            msg_en=f"Enable rule for {data.official_title}",
            msg_zh=f"启用 {data.official_title} 规则",
        )

    async def update_rule(self, bangumi_id: int, data: BangumiUpdate) -> ResponseModel:
        old_data = await self.bangumi.search_id(bangumi_id)
        if old_data:
            match_list = await self.match_torrents_list(old_data)
            async with DownloadClient() as client:
                path = client._gen_save_path(data)
                if match_list:
                    await client.move_torrent(match_list, path)
            data.save_path = path
            await self.bangumi.update(data, bangumi_id)
            return ResponseModel(
                status_code=200,
                status=True,
                msg_en=f"Update rule for {data.official_title}",
                msg_zh=f"更新 {data.official_title} 规则",
            )
        logger.error("Can't find data with {}", bangumi_id)
        return ResponseModel(
            status_code=406,
            status=False,
            msg_en=f"Can't find data with {bangumi_id}",
            msg_zh=f"无法找到 id {bangumi_id} 的数据",
        )
