import asyncio

from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.bangumi import BangumiDatabase
from module.database.factory import session_factory
from module.database.rss import RSSDatabase
from module.database.torrent import TorrentDatabase
from module.downloader import DownloadClient
from module.models import Bangumi, BangumiUpdate, ResponseModel
from module.network import RequestContent
from module.service.plex import PlexService
from module.utils import torrent_hash


class TorrentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.bangumi = BangumiDatabase(session)
        self.rss = RSSDatabase(session)
        self.torrent = TorrentDatabase(session)

    async def ensure_torrent_hashes(self) -> None:
        torrents = await self.torrent.search_all()
        missing_torrents = [
            torrent
            for torrent in torrents
            if torrent.bangumi_id is not None and not torrent.hash
        ]
        if not missing_torrents:
            return

        repaired_torrents = []
        async with RequestContent() as req:
            for torrent in missing_torrents:
                try:
                    if torrent.url.startswith("magnet"):
                        info_hash = torrent_hash.from_magnet(torrent.url)
                    else:
                        content = await req.get_content(torrent.url)
                        if content is None:
                            logger.warning(
                                "Skipping torrent id={} name={!r}: failed to fetch torrent content",
                                torrent.id,
                                torrent.name,
                            )
                            continue
                        info_hash = torrent_hash.from_torrent(content)
                except Exception as error:
                    logger.warning(
                        "Skipping torrent id={} name={!r}: failed to resolve hash: {}",
                        torrent.id,
                        torrent.name,
                        error,
                    )
                    continue
                if info_hash is None:
                    logger.warning(
                        "Skipping torrent id={} name={!r}: hash parser returned no hash",
                        torrent.id,
                        torrent.name,
                    )
                    continue
                torrent.hash = info_hash
                repaired_torrents.append(torrent)

        if repaired_torrents:
            await self.torrent.update_all(repaired_torrents)
            await self.session.commit()

    async def search_one(self, bangumi_id: int) -> Bangumi | ResponseModel:
        data = await self.bangumi.search_id(bangumi_id)
        if data is None:
            logger.error("Can't find data with {}", bangumi_id)
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find data with {bangumi_id}",
                msg_zh=f"无法找到 id {bangumi_id} 的数据",
            )
        return data

    @staticmethod
    async def delete_torrents(
        data: Bangumi, client: DownloadClient, hashes: set[str]
    ) -> ResponseModel:
        if hashes:
            await client.delete_torrent(hashes)
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

    async def disable_rule(
        self,
        _id: int,
        file: bool = False,
        *,
        wake_event: asyncio.Event | None = None,
    ) -> ResponseModel:
        data = await self.bangumi.search_id(_id)
        if not isinstance(data, Bangumi):
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find id {_id}",
                msg_zh=f"无法找到 id {_id}",
            )

        if file:
            hashes = await self.torrent.get_hashes_by_bangumi_id(_id)
            async with DownloadClient() as client:
                await self._set_rule_enabled(data, enabled=False)
                response = await self.delete_torrents(data, client, hashes)
            if hashes and response.status:
                try:
                    async with session_factory() as session:
                        queued = await PlexService(session).queue_library_refresh()
                        if queued and wake_event is not None:
                            wake_event.set()
                except Exception as exc:
                    logger.error(
                        "[Service] Plex refresh enqueue failed after torrent deletion (error_type={}, error={})",
                        type(exc).__name__,
                        exc,
                    )
            return response

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

    async def update_rule(
        self,
        bangumi_id: int,
        data: BangumiUpdate,
        *,
        wake_event: asyncio.Event | None = None,
    ) -> ResponseModel:
        old_data = await self.bangumi.search_id(bangumi_id)
        if old_data:
            hashes = await self.torrent.get_hashes_by_bangumi_id(bangumi_id)
            path = DownloadClient._gen_save_path(data)
            if hashes and path != old_data.save_path:
                async with DownloadClient() as client:
                    await client.move_torrent(hashes, path)
                try:
                    async with session_factory() as session:
                        queued = await PlexService(session).queue_library_refresh()
                        if queued and wake_event is not None:
                            wake_event.set()
                except Exception as exc:
                    logger.error(
                        "[Service] Plex refresh enqueue failed after torrent move (error_type={}, error={})",
                        type(exc).__name__,
                        exc,
                    )
            data.save_path = path
            if await self.bangumi.update(data, bangumi_id):
                await self.session.commit()
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
