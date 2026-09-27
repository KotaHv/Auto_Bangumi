from module.models.torrent import Torrent, TorrentInfo
from module.utils import torrent_versions


def test_partition_by_revision_keeps_highest_ties_in_order():
    kept, lower = torrent_versions.partition_by_revision(
        [("first", 1), ("tie", 3), ("middle", 2), ("other tie", 3)]
    )

    assert kept == ["tie", "other tie"]
    assert lower == ["first", "middle"]


def test_filter_superseded_torrents_preserves_input_and_unparseable(monkeypatch):
    torrents = [
        Torrent(name="old"),
        Torrent(name="latest one"),
        Torrent(name="unparseable"),
        Torrent(name="latest tie"),
    ]
    revisions = {
        "old": TorrentInfo(title="Series", episode=1, episode_revision=1),
        "latest one": TorrentInfo(title="Series", episode=1, episode_revision=2),
        "latest tie": TorrentInfo(title="Series", episode=1, episode_revision=2),
    }
    monkeypatch.setattr(
        torrent_versions,
        "torrent_name_parser",
        lambda name: revisions.get(name),
    )
    original = torrents.copy()

    filtered = torrent_versions.filter_superseded_torrents(torrents)

    assert filtered == [torrents[1], torrents[2], torrents[3]]
    assert torrents == original
    assert filtered is not torrents


def test_filter_superseded_torrents_empty_returns_new_list():
    torrents: list[Torrent] = []

    filtered = torrent_versions.filter_superseded_torrents(torrents)

    assert filtered == []
    assert filtered is not torrents
