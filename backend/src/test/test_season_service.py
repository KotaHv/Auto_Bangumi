from typing import cast

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlmodel.ext.asyncio.session import AsyncSession

import module.service.season as season_service_module
from module.database.bangumi import BangumiDatabase
from module.database.rss import RSSDatabase
from module.database.torrent import TorrentDatabase
from module.models import Bangumi, BangumiData, RSSItem, Torrent
from module.service.search import SearchService
from module.service.season import SeasonService
from module.utils.torrent_tags import RENAME_TAG
from test.conftest import serve_feeds


class DownloadClientStub:
    """Records what the service hands to qBittorrent instead of talking to it."""

    def __init__(
        self,
        *,
        accept: bool = True,
        refuse: set[str] | None = None,
        error: Exception | None = None,
    ) -> None:
        self.accept = accept
        self.refuse = refuse or set()
        self.error = error
        self.calls: list[tuple[list[str], Bangumi, list[str] | None]] = []

    async def __aenter__(self) -> DownloadClientStub:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def add_torrent(
        self,
        torrents: list[Torrent],
        bangumi: Bangumi,
        tags: list[str] | None = None,
    ) -> bool:
        if self.error is not None:
            raise self.error
        self.calls.append(([torrent.url for torrent in torrents], bangumi, tags))
        return self.accept and bangumi.official_title not in self.refuse


@pytest.fixture
def downloader(monkeypatch: pytest.MonkeyPatch):
    def install(
        *,
        accept: bool = True,
        refuse: set[str] | None = None,
        error: Exception | None = None,
    ) -> DownloadClientStub:
        client = DownloadClientStub(accept=accept, refuse=refuse, error=error)
        monkeypatch.setattr(season_service_module, "DownloadClient", lambda: client)
        return client

    return install


@pytest.mark.asyncio
async def test_collect_season_fetches_every_link_without_persisting(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    first = "https://rss.example.test/2021"
    second = "https://rss.example.test/2023"
    requested = serve_feeds(
        monkeypatch,
        {
            first: [("Example Show S01E01 [1080p]", "https://torrent.test/1")],
            second: [("Example Show S01E13 [1080p]", "https://torrent.test/13")],
        },
    )
    client = downloader()

    async with AsyncSession(database) as db:
        response = await SeasonService(db).collect_season(
            BangumiData(
                id=None,
                official_title="Example Show",
                title_raw="Example Show",
                season=1,
                offset=2,
                filter=["720"],
                rss_links=[first, second],
            )
        )

    assert response.status is True
    assert requested == [first, second]
    assert len(client.calls) == 1
    urls, bangumi, tags = client.calls[0]
    assert urls == ["https://torrent.test/1", "https://torrent.test/13"]
    assert bangumi.official_title == "Example Show"
    assert tags == [RENAME_TAG, "ab-offset=2"]

    async with AsyncSession(database) as check:
        assert await TorrentDatabase(check).search_all() == []


@pytest.mark.asyncio
async def test_collect_season_without_links_reports_failure(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    requested = serve_feeds(monkeypatch, {})
    client = downloader()

    async with AsyncSession(database) as db:
        response = await SeasonService(db).collect_season(
            BangumiData(id=None, official_title="Example Show", rss_links=[])
        )

    assert response.status is False
    assert response.status_code == 406
    assert requested == []
    assert client.calls == []


@pytest.mark.asyncio
async def test_collect_season_reports_already_collected(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    feed_url = "https://rss.example.test/2021"
    serve_feeds(
        monkeypatch,
        {feed_url: [("Example Show S01E01 [1080p]", "https://torrent.test/1")]},
    )
    client = downloader(accept=False)

    async with AsyncSession(database) as db:
        response = await SeasonService(db).collect_season(
            BangumiData(
                id=None,
                official_title="Example Show",
                title_raw="Example Show",
                season=1,
                filter=["720"],
                rss_links=[feed_url],
            )
        )

    assert response.status is False
    assert response.status_code == 406
    assert client.calls[0][0] == ["https://torrent.test/1"]


@pytest.mark.asyncio
async def test_subscribe_season_persists_rule_rss_and_torrents(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    feed_url = "https://rss.example.test/new"
    requested = serve_feeds(
        monkeypatch,
        {
            feed_url: [
                (
                    "[Lilith-Raws] Summer Time Rendering - 11 [Baha][WEB-DL][1080p][AVC AAC][CHT][MP4]",
                    "https://torrent.test/11",
                ),
                (
                    "[Lilith-Raws] Summer Time Rendering - 12 [Baha][WEB-DL][1080p][AVC AAC][CHT][MP4]",
                    "https://torrent.test/12",
                ),
            ]
        },
    )
    client = downloader()

    async with AsyncSession(database, expire_on_commit=False) as db:
        rule = Bangumi(
            official_title="夏日重现",
            title_raw="Placeholder Title",
            season=1,
            filter="720",
        )
        response = await SeasonService(db).subscribe_season(rule, RSSItem(url=feed_url))
        rule_id = cast(int, rule.id)

    assert response.status is True
    assert requested == [feed_url]
    assert client.calls[0][0] == ["https://torrent.test/11", "https://torrent.test/12"]

    async with AsyncSession(database) as check:
        saved = await BangumiDatabase(check).search_id(rule_id)
        assert saved is not None
        assert saved.added is True
        assert saved.eps_collect is True
        assert saved.title_raw == "Summer Time Rendering"
        assert saved.group_name == "Lilith-Raws"
        assert saved.dpi == "1080p"
        assert saved.source == "Baha"
        assert saved.subtitle == "CHT"
        assert [(rss.url, rss.name, rss.enabled) for rss in saved.rss_items] == [
            (feed_url, "夏日重现", True)
        ]
        torrents = await TorrentDatabase(check).search_all()

    assert [(torrent.url, torrent.rss_id) for torrent in torrents] == [
        ("https://torrent.test/11", saved.rss_items[0].id),
        ("https://torrent.test/12", saved.rss_items[0].id),
    ]


@pytest.mark.parametrize(
    ("feed", "error"),
    [
        ([], None),
        (
            [("Example Show S01E01 [1080p]", "https://torrent.test/1")],
            RuntimeError("qbittorrent is unreachable"),
        ),
    ],
    ids=["empty_feed", "download_error"],
)
@pytest.mark.asyncio
async def test_subscribe_season_keeps_subscription_when_nothing_is_downloaded(
    database: AsyncEngine,
    monkeypatch: pytest.MonkeyPatch,
    downloader,
    feed: list[tuple[str, str]],
    error: Exception | None,
):
    feed_url = "https://rss.example.test/new"
    serve_feeds(monkeypatch, {feed_url: feed})
    client = downloader(error=error)

    async with AsyncSession(database, expire_on_commit=False) as db:
        rule = Bangumi(
            official_title="Example Show",
            title_raw="Example Show",
            season=1,
            filter="720",
        )
        response = await SeasonService(db).subscribe_season(rule, RSSItem(url=feed_url))
        rule_id = cast(int, rule.id)

    assert response.status is True
    assert client.calls == []

    async with AsyncSession(database) as check:
        saved = await BangumiDatabase(check).search_id(rule_id)
        assert saved is not None
        assert [rss.url for rss in saved.rss_items] == [feed_url]
        assert await TorrentDatabase(check).search_all() == []


@pytest.mark.asyncio
async def test_subscribe_season_rejects_existing_rss(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    feed_url = "https://rss.example.test/taken"
    serve_feeds(
        monkeypatch,
        {feed_url: [("Example Show S01E01 [1080p]", "https://torrent.test/1")]},
    )
    client = downloader()

    async with AsyncSession(database, expire_on_commit=False) as db:
        assert await RSSDatabase(db).add(RSSItem(url=feed_url))
        await db.commit()
        rule = Bangumi(
            official_title="Example Show", title_raw="Example Show", season=1
        )
        response = await SeasonService(db).subscribe_season(rule, RSSItem(url=feed_url))

    assert response.status is False
    assert response.status_code == 406
    assert client.calls == []

    async with AsyncSession(database) as check:
        assert await BangumiDatabase(check).search_all() == []


@pytest.mark.asyncio
async def test_subscribe_existing_links_rule_and_collects_feed(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    feed_url = "https://rss.example.test/regular"
    requested = serve_feeds(
        monkeypatch,
        {feed_url: [("Example Show S01E01 [1080p]", "https://torrent.test/1")]},
    )
    client = downloader()

    async with AsyncSession(database, expire_on_commit=False) as db:
        rule = Bangumi(
            official_title="Example Show",
            title_raw="Example Show",
            season=1,
            filter="720",
            deleted=True,
        )
        await BangumiDatabase(db).add(rule)
        await db.commit()
        rule_id = cast(int, rule.id)
        response = await SeasonService(db).subscribe_existing(
            RSSItem(url=feed_url), rule_id
        )

    assert response.status is True
    assert requested == [feed_url]

    async with AsyncSession(database) as check:
        saved = await BangumiDatabase(check).search_id(rule_id)
        assert saved is not None
        assert saved.deleted is False
        assert [(rss.url, rss.aggregate, rss.enabled) for rss in saved.rss_items] == [
            (feed_url, False, True)
        ]
        torrents = await TorrentDatabase(check).search_all()

    assert [
        (torrent.url, torrent.rss_id, torrent.bangumi_id) for torrent in torrents
    ] == [("https://torrent.test/1", saved.rss_items[0].id, rule_id)]
    assert client.calls[0][0] == ["https://torrent.test/1"]


@pytest.mark.asyncio
async def test_subscribe_existing_without_rule_reports_failure(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    requested = serve_feeds(monkeypatch, {})
    client = downloader()

    async with AsyncSession(database) as db:
        response = await SeasonService(db).subscribe_existing(
            RSSItem(url="https://rss.example.test/regular"), 999
        )

    assert response.status is False
    assert response.status_code == 406
    assert requested == []
    assert client.calls == []


@pytest.mark.asyncio
async def test_force_collect_reads_every_linked_feed(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    first = "https://rss.example.test/2021"
    second = "https://rss.example.test/2023"
    requested = serve_feeds(
        monkeypatch,
        {
            first: [("Example Show S01E01 [1080p]", "https://torrent.test/1")],
            second: [("Example Show S01E13 [1080p]", "https://torrent.test/13")],
        },
    )
    client = downloader()

    async with AsyncSession(database, expire_on_commit=False) as db:
        rule = Bangumi(
            official_title="Example Show",
            title_raw="Example Show",
            season=1,
            filter="720",
        )
        rss_items = [RSSItem(url=first), RSSItem(url=second)]
        rule.rss_items = rss_items
        await BangumiDatabase(db).add(rule)
        await db.commit()
        rule_id = cast(int, rule.id)
        rss_ids = [cast(int, rss.id) for rss in rss_items]
        response = await SeasonService(db).force_collect(rule_id)

    assert response.status is True
    assert requested == [first, second]
    assert len(client.calls) == 1
    assert client.calls[0][0] == ["https://torrent.test/1", "https://torrent.test/13"]

    async with AsyncSession(database) as check:
        torrents = await TorrentDatabase(check).search_all()

    assert [(torrent.url, torrent.rss_id) for torrent in torrents] == [
        ("https://torrent.test/1", rss_ids[0]),
        ("https://torrent.test/13", rss_ids[1]),
    ]


@pytest.mark.asyncio
async def test_force_collect_searches_for_aggregate_association(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    feed_url = "https://rss.example.test/regular"
    client = downloader()

    async with AsyncSession(database, expire_on_commit=False) as db:
        rule = Bangumi(
            official_title="Example Show",
            title_raw="Example Show",
            season=1,
            filter="720",
        )
        aggregate = RSSItem(
            url="https://mikanani.me/RSS/Bangumi?bangumiId=1", aggregate=True
        )
        regular = RSSItem(url=feed_url)
        rule.rss_items = [aggregate, regular]
        await BangumiDatabase(db).add(rule)
        await db.commit()
        rule_id = cast(int, rule.id)
        search_url = SearchService.special_url(rule, "mikan").url
        requested = serve_feeds(
            monkeypatch,
            {
                search_url: [
                    ("Example Show S01E01 [1080p]", "https://torrent.test/search")
                ],
                feed_url: [
                    ("Example Show S01E02 [1080p]", "https://torrent.test/feed")
                ],
            },
        )
        response = await SeasonService(db).force_collect(rule_id)

    assert response.status is True
    assert sorted(requested) == sorted([search_url, feed_url])

    async with AsyncSession(database) as check:
        torrents = await TorrentDatabase(check).search_all()

    assert sorted((torrent.url, torrent.rss_id) for torrent in torrents) == sorted(
        [
            ("https://torrent.test/search", aggregate.id),
            ("https://torrent.test/feed", regular.id),
        ]
    )
    assert client.calls[0][0] == [
        "https://torrent.test/search",
        "https://torrent.test/feed",
    ]


@pytest.mark.asyncio
async def test_force_collect_skips_disabled_association(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    enabled = "https://rss.example.test/enabled"
    disabled = "https://rss.example.test/disabled"
    requested = serve_feeds(
        monkeypatch,
        {
            enabled: [("Example Show S01E01 [1080p]", "https://torrent.test/1")],
            disabled: [("Example Show S01E02 [1080p]", "https://torrent.test/2")],
        },
    )
    client = downloader()

    async with AsyncSession(database, expire_on_commit=False) as db:
        rule = Bangumi(
            official_title="Example Show",
            title_raw="Example Show",
            season=1,
            filter="720",
        )
        rule.rss_items = [
            RSSItem(url=enabled),
            RSSItem(url=disabled, enabled=False),
        ]
        await BangumiDatabase(db).add(rule)
        await db.commit()
        rule_id = cast(int, rule.id)
        response = await SeasonService(db).force_collect(rule_id)

    assert response.status is True
    assert requested == [enabled]
    assert client.calls[0][0] == ["https://torrent.test/1"]


@pytest.mark.asyncio
async def test_force_collect_reports_failure_without_torrents(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    feed_url = "https://rss.example.test/empty"
    serve_feeds(monkeypatch, {feed_url: []})
    client = downloader()

    async with AsyncSession(database, expire_on_commit=False) as db:
        rule = Bangumi(
            official_title="Example Show",
            title_raw="Example Show",
            season=1,
            filter="720",
        )
        rule.rss_items = [RSSItem(url=feed_url)]
        await BangumiDatabase(db).add(rule)
        await db.commit()
        rule_id = cast(int, rule.id)
        response = await SeasonService(db).force_collect(rule_id)

    assert response.status is False
    assert response.status_code == 406
    assert client.calls == []

    async with AsyncSession(database) as check:
        assert await TorrentDatabase(check).search_all() == []


@pytest.mark.asyncio
async def test_force_collect_without_rule_reports_failure(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    requested = serve_feeds(monkeypatch, {})
    client = downloader()

    async with AsyncSession(database) as db:
        response = await SeasonService(db).force_collect(999)

    assert response.status is False
    assert response.status_code == 406
    assert requested == []
    assert client.calls == []


@pytest.mark.asyncio
async def test_collect_incomplete_collects_pending_rules(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    client = downloader()

    async with AsyncSession(database, expire_on_commit=False) as db:
        pending = Bangumi(
            official_title="Pending Show",
            title_raw="Pending Show",
            season=1,
            filter="720",
        )
        collected = Bangumi(
            official_title="Collected Show",
            title_raw="Collected Show",
            season=1,
            filter="720",
            eps_collect=True,
        )
        removed = Bangumi(
            official_title="Removed Show",
            title_raw="Removed Show",
            season=1,
            filter="720",
            deleted=True,
        )
        await BangumiDatabase(db).add_all([pending, collected, removed])
        await db.commit()
        pending_id = cast(int, pending.id)
        requested = serve_feeds(
            monkeypatch,
            {
                SearchService.special_url(pending, "mikan").url: [
                    ("Pending Show S01E01 [1080p]", "https://torrent.test/pending")
                ],
                SearchService.special_url(collected, "mikan").url: [
                    ("Collected Show S01E01 [1080p]", "https://torrent.test/collected")
                ],
                SearchService.special_url(removed, "mikan").url: [
                    ("Removed Show S01E01 [1080p]", "https://torrent.test/removed")
                ],
            },
        )
        await SeasonService(db).collect_incomplete()

    assert requested == [SearchService.special_url(pending, "mikan").url]
    assert client.calls[0][0] == ["https://torrent.test/pending"]

    async with AsyncSession(database) as check:
        saved = await BangumiDatabase(check).search_id(pending_id)
        assert saved is not None
        assert saved.eps_collect is True
        torrents = await TorrentDatabase(check).search_all()

    assert [torrent.url for torrent in torrents] == ["https://torrent.test/pending"]


@pytest.mark.asyncio
async def test_collect_incomplete_keeps_refused_rule_pending(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    downloader(refuse={"Refused Show"})

    async with AsyncSession(database, expire_on_commit=False) as db:
        refused = Bangumi(
            official_title="Refused Show",
            title_raw="Refused Show",
            season=1,
            filter="720",
        )
        accepted = Bangumi(
            official_title="Accepted Show",
            title_raw="Accepted Show",
            season=1,
            filter="720",
        )
        await BangumiDatabase(db).add_all([refused, accepted])
        await db.commit()
        refused_id = cast(int, refused.id)
        accepted_id = cast(int, accepted.id)
        serve_feeds(
            monkeypatch,
            {
                SearchService.special_url(refused, "mikan").url: [
                    ("Refused Show S01E01 [1080p]", "https://torrent.test/refused")
                ],
                SearchService.special_url(accepted, "mikan").url: [
                    ("Accepted Show S01E01 [1080p]", "https://torrent.test/accepted")
                ],
            },
        )
        await SeasonService(db).collect_incomplete()

    async with AsyncSession(database) as check:
        refused_saved = await BangumiDatabase(check).search_id(refused_id)
        accepted_saved = await BangumiDatabase(check).search_id(accepted_id)
        assert refused_saved is not None
        assert accepted_saved is not None
        assert refused_saved.eps_collect is False
        assert accepted_saved.eps_collect is True
        torrents = await TorrentDatabase(check).search_all()

    assert [torrent.url for torrent in torrents] == ["https://torrent.test/accepted"]


@pytest.mark.asyncio
async def test_collect_incomplete_propagates_persistence_failure(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch, downloader
):
    downloader()

    async with AsyncSession(database, expire_on_commit=False) as db:
        rule = Bangumi(
            official_title="Broken Show",
            title_raw="Broken Show",
            season=1,
            filter="720",
        )
        await BangumiDatabase(db).add(rule)
        await db.commit()
        rule_id = cast(int, rule.id)
        serve_feeds(
            monkeypatch,
            {
                # Two episodes share one enclosure URL, so Torrent.url's unique
                # constraint fails on commit.
                SearchService.special_url(rule, "mikan").url: [
                    ("Broken Show S01E01 [1080p]", "https://torrent.test/broken"),
                    ("Broken Show S01E02 [1080p]", "https://torrent.test/broken"),
                ]
            },
        )
        with pytest.raises(IntegrityError):
            await SeasonService(db).collect_incomplete()

    async with AsyncSession(database) as check:
        saved = await BangumiDatabase(check).search_id(rule_id)
        assert saved is not None
        assert saved.eps_collect is False
        assert await TorrentDatabase(check).search_all() == []
