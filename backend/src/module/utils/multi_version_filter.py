from collections import defaultdict

from loguru import logger

from module.models.torrent import Torrent, TorrentInfo
from module.parser.analyser import torrent_name_parser


def filter_multi_version_torrents(torrents: list[Torrent]):
    if not torrents:
        return
    grouped_torrents: list[tuple[Torrent, TorrentInfo]] = defaultdict(list)

    for torrent in torrents:
        info = torrent_name_parser(torrent.name)
        if info is None:
            logger.warning(
                f"Failed to parse torrent name for torrent '{torrent}'. "
                f"Fallback to using torrent.name: '{torrent.name}'."
            )
            key = torrent.name
        else:
            key = f"{info.title}+{info.episode}"
        grouped_torrents[key].append((torrent, info))

    for torrents_group in grouped_torrents.values():
        if len(torrents_group) > 1:
            highest_revision = max(info.episode_revision for _, info in torrents_group)
            for torrent, info in torrents_group:
                if info.episode_revision < highest_revision:
                    torrents.remove(torrent)
