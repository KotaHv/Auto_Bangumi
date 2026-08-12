import asyncio

from loguru import logger
from qbittorrentapi import Client
from qbittorrentapi.exceptions import Conflict409Error
from qbittorrentapi.torrents import TorrentsAddedMetadata, TorrentStatusesT

from module.conf import settings
from module.models import Bangumi, Torrent
from module.network import RequestContent
from module.utils import torrent_hash

from .path import TorrentPath


class DownloadClient(TorrentPath):
    def __init__(self):
        super().__init__()
        self._client: Client = Client(
            host=settings.downloader.host,
            username=settings.downloader.username,
            password=settings.downloader.password,
            VERIFY_WEBUI_CERTIFICATE=settings.downloader.ssl,
            DISABLE_LOGGING_DEBUG_OUTPUT=True,
            REQUESTS_ARGS={"timeout": (3.1, 10)},
        )
        self.authed = False

    async def __aenter__(self):
        if not self.authed:
            await self.auth()
        else:
            logger.error("[Downloader] Already authed.")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.authed:
            await asyncio.to_thread(self._client.auth_log_out)
            self.authed = False

    async def auth(self):
        await asyncio.to_thread(self._client.auth_log_in)
        self.authed = True
        logger.debug("[Downloader] Authed.")

    async def get_torrent_info(
        self,
        category: str | None = "Bangumi",
        status_filter: TorrentStatusesT | None = "completed",
        tag: str | None = None,
        hash: list[str] | str | None = None,
    ):
        return await asyncio.to_thread(
            self._client.torrents_info,
            status_filter=status_filter,
            category=category,
            tag=tag,
            torrent_hashes=hash,
        )

    async def rename_torrent_file(self, _hash, old_path, new_path) -> bool:
        logger.info(f"{old_path} >> {new_path}")
        try:
            await asyncio.to_thread(
                self._client.torrents_rename_file,
                torrent_hash=_hash,
                old_path=old_path,
                new_path=new_path,
            )
            return True
        except Conflict409Error:
            logger.debug(f"Conflict409Error: {old_path} >> {new_path}")
            return False

    async def delete_torrent(self, hashes):
        await asyncio.to_thread(
            self._client.torrents_delete, delete_files=True, torrent_hashes=hashes
        )
        logger.info("[Downloader] Remove torrents.")

    async def _add_torrents(
        self, torrent_urls, torrent_files, save_path, category
    ) -> bool:
        try:
            resp = await asyncio.to_thread(
                self._client.torrents_add,
                is_paused=False,
                urls=torrent_urls,
                torrent_files=torrent_files,
                save_path=save_path,
                category=category,
                use_auto_torrent_management=False,
                content_layout="NoSubfolder",
            )
            logger.debug(f"[Downloader] Add torrent response: {resp}")
            if isinstance(resp, str):
                return resp == "Ok."
            if isinstance(resp, TorrentsAddedMetadata):
                return (
                    resp.get("pending_count", 0) > 0 or resp.get("success_count", 0) > 0
                )
            return False
        except Conflict409Error:
            if not torrent_urls:
                logger.info("[Downloader] Torrent files already exist in qBittorrent")
                return True
            torrent_hashes = []
            for url in torrent_urls:
                info_hash = torrent_hash.from_magnet(url)
                if info_hash is None:
                    logger.warning(
                        f"[Downloader] Cannot verify conflicting magnet link; failed to extract info hash: {url}"
                    )
                    return False
                torrent_hashes.append(info_hash)

            exists = await self.get_torrent_info(
                category=None, status_filter=None, hash=torrent_hashes
            )
            if len(exists) == len(torrent_urls):
                logger.info(
                    "[Downloader] Magnet torrents already exist in qBittorrent."
                )
                return True
            logger.warning(
                "[Downloader] Torrent add conflict, but torrent was not found"
            )
            return False

    async def add_torrent(self, torrent: Torrent | list, bangumi: Bangumi) -> bool:
        if not bangumi.save_path:
            bangumi.save_path = self._gen_save_path(bangumi)
        if isinstance(torrent, Torrent):
            torrent = [torrent]
        torrent_files = []
        torrent_urls = []
        async with RequestContent() as req:
            for t in torrent:
                t.bangumi_id = bangumi.id
                t.downloaded = True
                if "magnet" in t.url:
                    torrent_urls.append(t.url)
                    t.hash = torrent_hash.from_magnet(t.url)
                else:
                    torrent_data = await req.get_torrent_or_magnet(t)
                    if isinstance(torrent_data, bytes):
                        torrent_files.append(torrent_data)
                        t.hash = torrent_hash.from_torrent(torrent_data)
                    elif isinstance(torrent_data, str):
                        torrent_urls.append(torrent_data)
                        t.hash = torrent_hash.from_magnet(torrent_data)
                    else:
                        logger.error(
                            f'[Downloader] {t.name} torrent is corrupted; it is recommended to manually add the magnet link to qBittorrent, with the save path: "{bangumi.save_path}".'
                        )
                        t.downloaded = False

        if await self._add_torrents(
            torrent_urls=torrent_urls,
            torrent_files=torrent_files,
            save_path=bangumi.save_path,
            category="Bangumi",
        ):
            logger.debug(f"[Downloader] Add torrent: {bangumi.official_title}")
            return True
        else:
            for t in torrent:
                if not await self.get_torrent_info(
                    category=None, status_filter=None, hash=t.hash
                ):
                    t.downloaded = False
            logger.debug(f"[Downloader] Torrent added before: {bangumi.official_title}")
            return False

    async def move_torrent(self, hashes, location):
        await asyncio.to_thread(self._client.torrents_set_location, location, hashes)

    async def get_torrent_path(self, hashes):
        return (await asyncio.to_thread(self._client.torrents_info, hashes=hashes))[
            0
        ].save_path

    async def set_category(self, hashes, category):
        try:
            await asyncio.to_thread(
                self._client.torrents_set_category, category, hashes=hashes
            )
        except Conflict409Error:
            logger.warning(f"[Downloader] Category {category} does not exist")
            await asyncio.to_thread(self._client.torrents_createCategory, name=category)
            await asyncio.to_thread(
                self._client.torrents_set_category, category, hashes=hashes
            )

    async def set_tag(self, hashes, tag):
        await asyncio.to_thread(
            self._client.torrents_add_tags, tags=tag, torrent_hashes=hashes
        )

    async def remove_tag(self, hashes, tag):
        await asyncio.to_thread(
            self._client.torrents_remove_tags, tags=tag, torrent_hashes=hashes
        )
