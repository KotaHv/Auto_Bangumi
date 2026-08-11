from loguru import logger
from qbittorrentapi import Client
from qbittorrentapi.exceptions import (
    APIConnectionError,
    Conflict409Error,
)
from qbittorrentapi.torrents import TorrentsAddedMetadata, TorrentStatusesT

from module.utils import torrent_hash


class QbDownloader:
    def __init__(self, host: str, username: str, password: str, ssl: bool):
        self._client: Client = Client(
            host=host,
            username=username,
            password=password,
            VERIFY_WEBUI_CERTIFICATE=ssl,
            DISABLE_LOGGING_DEBUG_OUTPUT=True,
            REQUESTS_ARGS={"timeout": (3.1, 10)},
        )
        self.host = host
        self.username = username

    def auth(self):
        self._client.auth_log_in()
        return True

    def logout(self):
        self._client.auth_log_out()

    def check_host(self):
        try:
            self._client.app_version()
            return True
        except APIConnectionError:
            return False

    def check_rss(self, rss_link: str):
        pass

    def prefs_init(self, prefs):
        return self._client.app_set_preferences(prefs=prefs)

    def get_app_prefs(self):
        return self._client.app_preferences()

    def add_category(self, category):
        return self._client.torrents_createCategory(name=category)

    def torrents_info(
        self,
        status_filter: TorrentStatusesT | None,
        category: str | None,
        tag: str | None = None,
        hash: list[str] | str | None = None,
    ):
        return self._client.torrents_info(
            status_filter=status_filter, category=category, tag=tag, torrent_hashes=hash
        )

    def add_torrents(self, torrent_urls, torrent_files, save_path, category):
        try:
            resp = self._client.torrents_add(
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

            exists = self.torrents_info(
                status_filter=None, category=None, hash=torrent_hashes
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

    def torrents_delete(self, hash):
        return self._client.torrents_delete(delete_files=True, torrent_hashes=hash)

    def torrents_rename_file(self, torrent_hash, old_path, new_path) -> bool:
        try:
            self._client.torrents_rename_file(
                torrent_hash=torrent_hash, old_path=old_path, new_path=new_path
            )
            return True
        except Conflict409Error:
            logger.debug(f"Conflict409Error: {old_path} >> {new_path}")
            return False

    def rss_add_feed(self, url, item_path):
        try:
            self._client.rss_add_feed(url, item_path)
        except Conflict409Error:
            logger.warning(f"[Downloader] RSS feed {url} already exists")

    def rss_remove_item(self, item_path):
        try:
            self._client.rss_remove_item(item_path)
        except Conflict409Error:
            logger.warning(f"[Downloader] RSS item {item_path} does not exist")

    def rss_get_feeds(self):
        return self._client.rss_items()

    def rss_set_rule(self, rule_name, rule_def):
        self._client.rss_set_rule(rule_name, rule_def)

    def move_torrent(self, hashes, new_location):
        self._client.torrents_set_location(new_location, hashes)

    def get_download_rule(self):
        return self._client.rss_rules()

    def get_torrent_path(self, _hash):
        return self._client.torrents_info(hashes=_hash)[0].save_path

    def set_category(self, _hash, category):
        try:
            self._client.torrents_set_category(category, hashes=_hash)
        except Conflict409Error:
            logger.warning(f"[Downloader] Category {category} does not exist")
            self.add_category(category)
            self._client.torrents_set_category(category, hashes=_hash)

    def set_tag(self, _hash, tag):
        self._client.torrents_add_tags(tags=tag, torrent_hashes=_hash)

    def remove_tag(self, _hash, tag):
        self._client.torrents_remove_tags(tags=tag, torrent_hashes=_hash)

    def check_connection(self):
        return self._client.app_version()

    def remove_rule(self, rule_name):
        self._client.rss_remove_rule(rule_name)

    def add_tag(self, _hash, tag):
        self._client.torrents_add_tags(tags=tag, hashes=_hash)
