from collections import defaultdict
from dataclasses import dataclass

from loguru import logger
from qbittorrentapi.torrents import TorrentDictionary
from sqlmodel.ext.asyncio.session import AsyncSession

from module.conf import settings
from module.database.bangumi import BangumiDatabase
from module.database.torrent import TorrentDatabase
from module.downloader import DownloadClient
from module.models import EpisodeFile, Notification, SubtitleFile
from module.parser import TitleParser
from module.utils.torrent_tags import RENAME_TAG, parse_offset_tag


@dataclass(slots=True)
class _RenameTorrent:
    info: TorrentDictionary
    media_paths: list[str]
    subtitle_paths: list[str]
    bangumi_name: str
    season: int


class RenameService:
    def __init__(self, session: AsyncSession, client: DownloadClient):
        self.bangumi = BangumiDatabase(session)
        self.torrent = TorrentDatabase(session)
        self.client = client
        self._parser = TitleParser()

    @staticmethod
    def _gen_path(
        file_info: EpisodeFile | SubtitleFile,
        bangumi_name: str,
        offset: int,
    ) -> str:
        method = settings.bangumi_manage.rename_method
        if isinstance(file_info, SubtitleFile):
            method = "subtitle_" + method
        if method in ("none", "subtitle_none"):
            return file_info.media_path
        if method == "normal":
            logger.warning("[Renamer] Normal rename method is deprecated.")
            return file_info.media_path
        if method not in ("pn", "advance", "subtitle_pn", "subtitle_advance"):
            logger.error("[Renamer] Unknown rename method: {}", method)
            return file_info.media_path

        season = str(file_info.season).zfill(2)
        episode = str(file_info.episode + offset).zfill(2)
        if (
            not settings.bangumi_manage.retain_latest_media_version
            and file_info.episode_revision != 1
        ):
            episode = f"{episode}v{file_info.episode_revision}"
        title = file_info.title if method in ("pn", "subtitle_pn") else bangumi_name
        language = file_info.language if isinstance(file_info, SubtitleFile) else ""
        subtitle = (
            f".{language}" if method in ("subtitle_pn", "subtitle_advance") else ""
        )
        return f"{title} S{season}E{episode}{subtitle}{file_info.suffix}"

    async def _rename_file(
        self, torrent: _RenameTorrent, offset: int
    ) -> tuple[bool, Notification | None]:
        media_path = torrent.media_paths[0]
        ep = self._parser.torrent_parser(
            torrent_name=torrent.info.name,
            torrent_path=media_path,
            season=torrent.season,
        )
        if ep:
            new_path = self._gen_path(ep, torrent.bangumi_name, offset=offset)
            if media_path != new_path:
                renamed = await self.client.rename_torrent_file(
                    _hash=torrent.info.hash,
                    old_path=media_path,
                    new_path=new_path,
                )
                if not renamed:
                    logger.warning("[Renamer] {} rename failed", media_path)
                    return False, None
                return True, Notification(
                    official_title=torrent.bangumi_name,
                    season=ep.season,
                    episode=ep.episode,
                )
            return True, None
        logger.warning("[Renamer] {} parse failed", media_path)
        if settings.bangumi_manage.remove_bad_torrent:
            await self.client.delete_torrent(torrent.info.hash)
        return False, None

    async def _rename_collection(self, torrent: _RenameTorrent, offset: int) -> bool:
        for media_path in torrent.media_paths:
            if self.client.is_ep(media_path):
                ep = self._parser.torrent_parser(
                    torrent_path=media_path,
                    season=torrent.season,
                )
                if ep:
                    new_path = self._gen_path(ep, torrent.bangumi_name, offset=offset)
                    if media_path != new_path:
                        renamed = await self.client.rename_torrent_file(
                            _hash=torrent.info.hash,
                            old_path=media_path,
                            new_path=new_path,
                        )
                        if not renamed:
                            logger.warning("[Renamer] {} rename failed", media_path)
                            if settings.bangumi_manage.remove_bad_torrent:
                                await self.client.delete_torrent(torrent.info.hash)
                            return False
        return True

    async def _rename_subtitles(self, torrent: _RenameTorrent, offset: int) -> bool:
        for subtitle_path in torrent.subtitle_paths:
            sub = self._parser.torrent_parser(
                torrent_path=subtitle_path,
                torrent_name=torrent.info.name,
                season=torrent.season,
                file_type="subtitle",
            )
            if sub:
                new_path = self._gen_path(sub, torrent.bangumi_name, offset=offset)
                if subtitle_path != new_path:
                    renamed = await self.client.rename_torrent_file(
                        _hash=torrent.info.hash,
                        old_path=subtitle_path,
                        new_path=new_path,
                    )
                    if not renamed:
                        logger.warning("[Renamer] {} rename failed", subtitle_path)
                        return False
        return True

    async def _prune_superseded_torrents(
        self,
        torrents: list[_RenameTorrent],
        tag: str,
    ) -> list[_RenameTorrent]:
        grouped_torrents = defaultdict(list)
        seen_hashes = set()

        def group_torrent(torrent: _RenameTorrent) -> None:
            if len(torrent.media_paths) != 1:
                return
            ep = self._parser.torrent_parser(
                torrent_path=torrent.media_paths[0],
                torrent_name=torrent.info.name,
                season=torrent.season,
            )
            if ep is None:
                return
            key = (torrent.bangumi_name, torrent.season, ep.episode)
            grouped_torrents[key].append((torrent.info, ep))

        for torrent in torrents:
            seen_hashes.add(torrent.info.hash)
            group_torrent(torrent)

        if not grouped_torrents:
            return torrents

        for title in {bangumi_name for bangumi_name, _, _ in grouped_torrents}:
            if title == tag:
                continue
            for info in await self.client.get_torrent_info(tag=title):
                if info.hash in seen_hashes:
                    continue
                seen_hashes.add(info.hash)
                bangumi_name, season = self.client.path_to_bangumi(info.save_path)
                if not bangumi_name:
                    continue
                files = await self.client.get_torrent_files(info.hash)
                media_paths, subtitle_paths = self.client.check_files(files)
                group_torrent(
                    _RenameTorrent(
                        info=info,
                        media_paths=media_paths,
                        subtitle_paths=subtitle_paths,
                        bangumi_name=bangumi_name,
                        season=season,
                    )
                )

        deleted_hashes = set()
        for (bangumi_name, season, episode), grouped in grouped_torrents.items():
            max_revision = max(ep.episode_revision for _, ep in grouped)
            obsolete_infos = [
                info for info, ep in grouped if ep.episode_revision < max_revision
            ]
            if not obsolete_infos:
                continue
            episode_label = f"{bangumi_name} S{season:02d}E{str(episode).zfill(2)}"
            kept_names = "\n\t\t".join(
                f"- {info.name}"
                for info, ep in grouped
                if ep.episode_revision == max_revision
            )
            deleted_names = "\n\t\t".join(f"- {info.name}" for info in obsolete_infos)
            logger.warning(
                "[Renamer] Detected multiple versions for '{}'.\n"
                "\tKeeping version(s):\n"
                "\t\t{}\n"
                "\tDeleting version(s):\n"
                "\t\t{}",
                episode_label,
                kept_names,
                deleted_names,
            )
            obsolete_hashes = [info.hash for info in obsolete_infos]
            await self.client.delete_torrent(obsolete_hashes)
            deleted_hashes.update(obsolete_hashes)
        return [
            torrent for torrent in torrents if torrent.info.hash not in deleted_hashes
        ]

    async def rename(self, tag: str = "") -> list[Notification]:
        logger.debug("[Renamer] Start rename process.")
        if tag:
            candidates = await self.client.get_torrent_info(tag=tag)
        else:
            untagged = await self.client.get_torrent_info(tag="")
            pending = await self.client.get_torrent_info(tag=RENAME_TAG)
            candidates = [*untagged, *pending]
        if not candidates:
            return []

        torrents: list[_RenameTorrent] = []
        for info in candidates:
            bangumi_name, season = self.client.path_to_bangumi(info.save_path)
            if not bangumi_name:
                logger.warning(
                    "[Renamer] Skipping '{}' because its bangumi title is empty",
                    info.name,
                )
                continue
            files = await self.client.get_torrent_files(info.hash)
            media_paths, subtitle_paths = self.client.check_files(files)
            if not media_paths:
                logger.warning("[Renamer] {} has no media file", info.name)
                continue
            torrents.append(
                _RenameTorrent(
                    info=info,
                    media_paths=media_paths,
                    subtitle_paths=subtitle_paths,
                    bangumi_name=bangumi_name,
                    season=season,
                )
            )

        if not torrents:
            return []
        if settings.bangumi_manage.retain_latest_media_version:
            torrents = await self._prune_superseded_torrents(torrents, tag)
        renamed_info: list[Notification] = []
        offset_cache: dict[int, int] = {}
        for torrent in torrents:
            tags = {
                item.strip()
                for item in (torrent.info.tags or "").split(",")
                if item.strip()
            }

            bangumi_id = await self.torrent.get_bangumi_id(torrent.info.hash)
            if bangumi_id is None:
                offset = parse_offset_tag(torrent.info.tags or "") or 0
            else:
                if bangumi_id not in offset_cache:
                    offset_cache[bangumi_id] = await self.bangumi.get_offset(bangumi_id)
                offset = offset_cache[bangumi_id]

            if len(torrent.media_paths) == 1:
                success, notify_info = await self._rename_file(torrent, offset)
            else:
                logger.info("[Renamer] Start rename collection")
                success = await self._rename_collection(torrent, offset)
                notify_info = None

            if success and torrent.subtitle_paths:
                success = await self._rename_subtitles(torrent, offset)

            if not success:
                continue

            await self.client.set_tag(torrent.info.hash, torrent.bangumi_name)
            if len(torrent.media_paths) > 1:
                await self.client.set_category(torrent.info.hash, "BangumiCollection")

            if RENAME_TAG in tags:
                await self.client.remove_tag(torrent.info.hash, RENAME_TAG)
            if notify_info:
                renamed_info.append(notify_info)
        logger.debug("[Renamer] Rename process finished.")
        return renamed_info

    async def rename_for_path(self, save_path: str) -> list[Notification]:
        return await self.rename(tag=self.client.path_to_bangumi(save_path)[0])
