import asyncio
from collections import defaultdict

from loguru import logger

from module.conf import settings
from module.database import Database
from module.downloader import DownloadClient
from module.models import EpisodeFile, Notification, SubtitleFile
from module.parser import TitleParser


class Renamer(DownloadClient):
    def __init__(self):
        super().__init__()
        self._parser = TitleParser()
        self.check_pool = {}

    @staticmethod
    def gen_path(
        file_info: EpisodeFile | SubtitleFile,
        bangumi_name: str,
        method: str,
        offset: int,
    ) -> str:
        season = str(file_info.season).zfill(2)
        episode = str(file_info.episode + offset).zfill(2)
        language = file_info.language if isinstance(file_info, SubtitleFile) else ""
        if (
            not settings.bangumi_manage.retain_latest_media_version
            and file_info.episode_revision != 1
        ):
            episode = f"{episode}v{file_info.episode_revision}"
        if method == "none" or method == "subtitle_none":
            return file_info.media_path
        elif method == "pn":
            return f"{file_info.title} S{season}E{episode}{file_info.suffix}"
        elif method == "advance":
            return f"{bangumi_name} S{season}E{episode}{file_info.suffix}"
        elif method == "normal":
            logger.warning("[Renamer] Normal rename method is deprecated.")
            return file_info.media_path
        elif method == "subtitle_pn":
            return f"{file_info.title} S{season}E{episode}.{language}{file_info.suffix}"
        elif method == "subtitle_advance":
            return f"{bangumi_name} S{season}E{episode}.{language}{file_info.suffix}"
        else:
            logger.error("[Renamer] Unknown rename method: {}", method)
            return file_info.media_path

    async def rename_file(
        self,
        torrent_name: str,
        media_path: str,
        bangumi_name: str,
        method: str,
        season: int,
        _hash: str,
        offset: int,
        **kwargs,
    ):
        ep = self._parser.torrent_parser(
            torrent_name=torrent_name,
            torrent_path=media_path,
            season=season,
        )
        if ep:
            new_path = self.gen_path(ep, bangumi_name, method=method, offset=offset)
            if media_path != new_path:
                if new_path not in self.check_pool.keys():
                    renamed = await self.rename_torrent_file(
                        _hash=_hash,
                        old_path=media_path,
                        new_path=new_path,
                    )
                    if renamed:
                        return Notification(
                            official_title=bangumi_name,
                            season=ep.season,
                            episode=ep.episode,
                        )
        else:
            logger.warning("[Renamer] {} parse failed", media_path)
            if settings.bangumi_manage.remove_bad_torrent:
                await self.delete_torrent(_hash)
        return None

    async def rename_collection(
        self,
        media_list: list[str],
        bangumi_name: str,
        season: int,
        method: str,
        _hash: str,
        offset: int,
        **kwargs,
    ):
        for media_path in media_list:
            if self.is_ep(media_path):
                ep = self._parser.torrent_parser(
                    torrent_path=media_path,
                    season=season,
                )
                if ep:
                    new_path = self.gen_path(
                        ep, bangumi_name, method=method, offset=offset
                    )
                    if media_path != new_path:
                        renamed = await self.rename_torrent_file(
                            _hash=_hash,
                            old_path=media_path,
                            new_path=new_path,
                        )
                        if not renamed:
                            logger.warning("[Renamer] {} rename failed", media_path)
                            # Delete bad torrent.
                            if settings.bangumi_manage.remove_bad_torrent:
                                await self.delete_torrent(_hash)
                                break

    async def rename_subtitles(
        self,
        subtitle_list: list[str],
        torrent_name: str,
        bangumi_name: str,
        season: int,
        method: str,
        _hash: str,
        offset: int,
        **kwargs,
    ):
        method = "subtitle_" + method
        for subtitle_path in subtitle_list:
            sub = self._parser.torrent_parser(
                torrent_path=subtitle_path,
                torrent_name=torrent_name,
                season=season,
                file_type="subtitle",
            )
            if sub:
                new_path = self.gen_path(
                    sub, bangumi_name, method=method, offset=offset
                )
                if subtitle_path != new_path:
                    renamed = await self.rename_torrent_file(
                        _hash=_hash,
                        old_path=subtitle_path,
                        new_path=new_path,
                    )
                    if not renamed:
                        logger.warning("[Renamer] {} rename failed", subtitle_path)

    async def check_multi_version(self, tag=None):
        if not settings.bangumi_manage.retain_latest_media_version:
            return
        torrents_info = await self.get_torrent_info(tag=tag)
        grouped_torrents = defaultdict(list)

        for torrent_info in torrents_info:
            media_list, _ = self.check_files(torrent_info)
            if len(media_list) == 1:
                bangumi_name, season = self._path_to_bangumi(torrent_info.save_path)
                media_path = media_list[0]
                ep = self._parser.torrent_parser(
                    torrent_path=media_path,
                    torrent_name=torrent_info.name,
                    season=season,
                )
                if ep is None:
                    continue
                key = f"{bangumi_name} S{season:02d}E{str(ep.episode).zfill(2)}"
                grouped_torrents[key].append((torrent_info, ep))

        multi_version_torrents = {
            k: v for k, v in grouped_torrents.items() if len(v) > 1
        }

        for key, torrents in multi_version_torrents.items():
            torrent_hashes = {torrent[0].hash: torrent[0].name for torrent in torrents}
            max_revision = max(ep.episode_revision for _, ep in torrents)
            keep_hashes = []
            keep_names = []

            for torrent_info, ep in torrents:
                if ep.episode_revision == max_revision:
                    keep_hashes.append(torrent_info.hash)
                    keep_names.append(torrent_hashes.pop(torrent_info.hash))
            if torrent_hashes:
                logger.warning(
                    "[Renamer] Detected multiple versions for '{}'.\n"
                    "\tKeeping version(s):\n"
                    "\t\t{}\n"
                    "\tDeleting version(s):\n"
                    "\t\t{}".format(
                        key,
                        "\n\t\t".join(f"- {name}" for name in keep_names),
                        "\n\t\t".join(f"- {name}" for name in torrent_hashes.values()),
                    )
                )
                await self.delete_torrent(torrent_hashes.keys())

    async def rename(self, tag="") -> list[Notification]:
        # Get torrent info
        logger.debug("[Renamer] Start rename process.")
        if tag:
            await self.check_multi_version(tag=tag)
        else:
            await self.check_multi_version()
        rename_method = settings.bangumi_manage.rename_method
        torrents_info = await self.get_torrent_info(tag=tag)
        renamed_info: list[Notification] = []
        for info in torrents_info:
            media_list, subtitle_list = self.check_files(info)
            bangumi_name, season = self._path_to_bangumi(info.save_path)
            kwargs = {
                "torrent_name": info.name,
                "bangumi_name": bangumi_name,
                "method": rename_method,
                "season": season,
                "_hash": info.hash,
                "offset": 0,
            }
            await self.set_tag(info.hash, bangumi_name)
            async with Database() as db:
                bangumi_id = await db.torrent.get_bangumi_id(info.hash)
                if bangumi_id:
                    kwargs["offset"] = await db.bangumi.get_offset(bangumi_id)
            # Rename single media file
            if len(media_list) == 1:
                notify_info = await self.rename_file(media_path=media_list[0], **kwargs)
                if notify_info:
                    renamed_info.append(notify_info)
                # Rename subtitle file
                if len(subtitle_list) > 0:
                    await self.rename_subtitles(subtitle_list=subtitle_list, **kwargs)
            # Rename collection
            elif len(media_list) > 1:
                logger.info("[Renamer] Start rename collection")
                await self.rename_collection(media_list=media_list, **kwargs)
                if len(subtitle_list) > 0:
                    await self.rename_subtitles(subtitle_list=subtitle_list, **kwargs)
                await self.set_category(info.hash, "BangumiCollection")
            else:
                logger.warning("[Renamer] {} has no media file", info.name)
                await self.remove_tag(info.hash, bangumi_name)
        logger.debug("[Renamer] Rename process finished.")
        return renamed_info


if __name__ == "__main__":
    from module.conf import setup_logger

    settings.log.debug_enable = True
    setup_logger()

    async def _main():
        async with Renamer() as renamer:
            await renamer.rename()

    asyncio.run(_main())
