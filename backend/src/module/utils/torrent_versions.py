from collections import defaultdict

from loguru import logger

from module.models.torrent import Torrent
from module.parser.analyser import torrent_name_parser


def partition_by_revision[T](
    items: list[tuple[T, int]],
) -> tuple[list[T], list[T]]:
    if not items:
        return [], []
    highest_revision = max(revision for _, revision in items)
    highest = []
    lower = []
    for item, revision in items:
        if revision == highest_revision:
            highest.append(item)
        else:
            lower.append(item)
    return highest, lower


def filter_superseded_torrents(torrents: list[Torrent]) -> list[Torrent]:
    grouped_torrents: defaultdict[tuple[str, int | float], list[tuple[str, int]]] = (
        defaultdict(list)
    )
    kept_names: set[str] = set()

    for torrent in torrents:
        info = torrent_name_parser(torrent.name)
        if info is None:
            logger.warning(
                "Failed to parse torrent name for torrent '{}'. Fallback to using torrent.name: '{}'.",
                torrent,
                torrent.name,
            )
            kept_names.add(torrent.name)
            continue
        grouped_torrents[(info.title, info.episode)].append(
            (torrent.name, info.episode_revision)
        )

    for group in grouped_torrents.values():
        kept, _ = partition_by_revision(group)
        kept_names.update(kept)

    return [torrent for torrent in torrents if torrent.name in kept_names]
