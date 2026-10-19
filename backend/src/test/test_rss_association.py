from collections.abc import AsyncIterator
from typing import cast

import httpx2
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel.pool import StaticPool

import module.service.rss as rss_service_module
from module.database.bangumi import BangumiDatabase
from module.database.rss import RSSDatabase
from module.database.torrent import TorrentDatabase
from module.downloader import DownloadClient
from module.models import (
    Bangumi,
    BangumiData,
    RSSAnalysisOption,
    RSSAnalysisResult,
    RSSItem,
    Torrent,
)
from module.service.bangumi import BangumiService
from module.service.rss import RssService
from module.service.torrent import TorrentService


@pytest_asyncio.fixture
async def database() -> AsyncIterator[AsyncEngine]:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as connection:
        await connection.run_sync(SQLModel.metadata.create_all)
    yield engine
    await engine.dispose()


async def add_rule_with_rss(
    session: AsyncSession, bangumi: Bangumi, rss_items: list[RSSItem]
) -> None:
    bangumi.rss_items = rss_items
    await BangumiDatabase(session).add(bangumi)
    assert bangumi.id is not None


def serve_feeds(monkeypatch, feeds: dict[str, list[tuple[str, str]]]) -> list[str]:
    requested: list[str] = []

    async def handler(request: httpx2.Request) -> httpx2.Response:
        url = str(request.url)
        requested.append(url)
        items = "".join(
            f"<item><title>{title}</title>"
            f"<link>https://mikanani.test/{index}</link>"
            f'<enclosure url="{torrent_url}"/></item>'
            for index, (title, torrent_url) in enumerate(feeds.get(url, []))
        )
        return httpx2.Response(200, text=f"<rss><channel>{items}</channel></rss>")

    transport = httpx2.MockTransport(handler)
    original_client = httpx2.AsyncClient

    def client(*args, **kwargs):
        return original_client(*args, transport=transport, **kwargs)

    monkeypatch.setattr(httpx2, "AsyncClient", client)
    return requested


@pytest.mark.asyncio
async def test_analyze_feed_returns_exact_match(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
    feed_url = "https://rss.example.test/a"
    requested = serve_feeds(
        monkeypatch,
        {
            feed_url: [
                ("[Group A] Example Show S01E01 [1080p]", "https://torrent.test/a")
            ]
        },
    )

    async with AsyncSession(database, expire_on_commit=False) as db:
        repository = BangumiDatabase(db)
        exact = Bangumi(
            title_raw="Example Show",
            season=1,
            season_raw="S01",
            group_name="Group A",
        )
        other = Bangumi(
            title_raw="Example Show",
            season=1,
            group_name="Group B",
        )
        await repository.add_all([exact, other])
        await db.commit()

        service = RssService(db)
        result = await service.analyze_feed(RSSItem(url=feed_url, parser="custom"))

        assert requested == [feed_url]
        assert isinstance(result, RSSAnalysisResult)
        assert result.options == [
            RSSAnalysisOption(
                type="exact_match", bangumi=BangumiData.from_bangumi(exact)
            )
        ]


@pytest.mark.asyncio
async def test_analyze_feed_offers_candidates_for_other_groups(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
    feed_url = "https://rss.example.test/candidates"
    requested = serve_feeds(
        monkeypatch,
        {
            feed_url: [
                ("[Group C] Example Show S01E01 [1080p]", "https://torrent.test/c")
            ]
        },
    )
    candidates = [
        Bangumi(title_raw="Example Show", season=1, group_name=group)
        for group in ("Group A", "Group B")
    ]

    async with AsyncSession(database, expire_on_commit=False) as db:
        await BangumiDatabase(db).add_all(candidates)
        await db.commit()
        service = RssService(db)
        rss_item = RSSItem(url=feed_url, parser="custom")

        result = await service.analyze_feed(rss_item)

    assert requested == [feed_url]
    assert isinstance(result, RSSAnalysisResult)
    assert {
        option.bangumi.group_name
        for option in result.options
        if option.type == "candidate"
    } == {"Group A", "Group B"}
    created = result.options[-1]
    assert created.type == "create"
    assert created.bangumi.title_raw == "Example Show"
    assert created.bangumi.season == 1
    assert created.bangumi.season_raw == "S01"
    assert created.bangumi.group_name == "Group C"
    assert created.bangumi.rss_links == [rss_item.url]


@pytest.mark.asyncio
async def test_aggregate_refresh_links_torrent_to_created_rule(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
    torrent = Torrent(name="Example Show S01E01", url="https://torrent.test/1")
    parsed = Bangumi(title_raw="Example Show", season=1, group_name="Example Group")
    rss_item = RSSItem(
        url="https://rss.example.test/aggregate.xml", aggregate=True, parser="custom"
    )
    downloads: list[tuple[str, int | None]] = []

    class RequestStub:
        async def __aenter__(self) -> RequestStub:
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def get_torrents(
            self, _url: str, _filter: str | None = None
        ) -> list[Torrent]:
            return [torrent]

    class DownloadClientStub:
        async def add_torrent(self, torrent: Torrent, bangumi: Bangumi) -> bool:
            downloads.append((torrent.url, bangumi.id))
            return True

    monkeypatch.setattr(rss_service_module, "RequestContent", RequestStub)

    async with AsyncSession(database, expire_on_commit=False) as db:
        assert await RSSDatabase(db).add(rss_item)
        service = RssService(db)

        async def raw_parser(*, raw: str) -> Bangumi:
            assert raw == torrent.name
            return parsed

        monkeypatch.setattr(service.parser, "raw_parser", raw_parser)
        await service.refresh_aggregate_rss(
            rss_item, cast(DownloadClient, DownloadClientStub())
        )

    async with AsyncSession(database, expire_on_commit=False) as check:
        rules = await BangumiDatabase(check).search_all()
        saved_torrents = await TorrentDatabase(check).search_all()
        assert len(rules) == 1
        assert rules[0].id is not None
        linked_rss = rules[0].rss_items

    assert torrent.bangumi_id == rules[0].id
    assert saved_torrents == [torrent]
    assert downloads == [(torrent.url, rules[0].id)]
    assert [item.url for item in linked_rss] == [rss_item.url]


@pytest.mark.asyncio
async def test_regular_refresh_uses_rule_and_filter(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
    url = "https://rss.example.test/show.xml"
    torrent = Torrent(name="Example Show S01E01", url="https://torrent.test/1")
    calls: list[tuple[str, str | None]] = []
    downloads: list[str] = []

    class RequestStub:
        async def __aenter__(self) -> RequestStub:
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def get_torrents(
            self, request_url: str, torrent_filter: str | None = None
        ) -> list[Torrent]:
            calls.append((request_url, torrent_filter))
            return [torrent]

    class DownloadClientStub:
        async def add_torrent(self, torrent: Torrent, _bangumi: Bangumi) -> bool:
            downloads.append(torrent.url)
            return True

    monkeypatch.setattr(rss_service_module, "RequestContent", RequestStub)

    async with AsyncSession(database, expire_on_commit=False) as db:
        rule = Bangumi(
            title_raw="Example Show",
            season=1,
            group_name="Example Group",
            filter="1080p,\\d+-\\d+",
        )
        rss_item = RSSItem(url=url)
        assert await RSSDatabase(db).add(rss_item)
        await add_rule_with_rss(db, rule, [rss_item])
        await db.commit()
        assert rss_item.id is not None

    async with AsyncSession(database, expire_on_commit=False) as refresh_session:
        service = RssService(refresh_session)
        loaded_rss = await RSSDatabase(refresh_session).search_id_with_bangumis(
            rss_item.id
        )
        assert loaded_rss is not None
        await service.refresh_regular_rss(
            loaded_rss, cast(DownloadClient, DownloadClientStub())
        )

    assert torrent.bangumi_id == rule.id
    assert torrent.rss_id == rss_item.id
    assert calls == [(url, "1080p|\\d+-\\d+")]
    assert downloads == [torrent.url]


@pytest.mark.asyncio
async def test_unassociated_regular_rss_does_not_block_aggregate_refresh(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
    regular = RSSItem(url="https://rss.example.test/unassociated.xml")
    aggregate = RSSItem(url="https://rss.example.test/aggregate.xml", aggregate=True)
    warnings: list[str] = []
    aggregate_calls: list[str] = []

    class LoggerStub:
        def debug(self, *_args: object) -> None:
            return None

        def warning(self, message: str, *args: object) -> None:
            warnings.append(message.format(*args))

    class UnexpectedRequest:
        def __init__(self) -> None:
            pytest.fail("unassociated regular RSS must not make a network request")

    class DownloadClientStub:
        async def __aenter__(self) -> DownloadClientStub:
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

    monkeypatch.setattr(rss_service_module, "logger", LoggerStub())
    monkeypatch.setattr(rss_service_module, "RequestContent", UnexpectedRequest)
    monkeypatch.setattr(rss_service_module, "DownloadClient", DownloadClientStub)

    async with AsyncSession(database, expire_on_commit=False) as db:
        service = RssService(db)

        async def search_active_with_bangumis() -> list[RSSItem]:
            return [regular, aggregate]

        async def refresh_aggregate(rss_item: RSSItem, _client: object) -> None:
            aggregate_calls.append(rss_item.url)

        monkeypatch.setattr(
            service.rss, "search_active_with_bangumis", search_active_with_bangumis
        )
        monkeypatch.setattr(service, "refresh_aggregate_rss", refresh_aggregate)

        await service.refresh_rss()

    assert any(regular.url in warning for warning in warnings)
    assert aggregate_calls == [aggregate.url]


@pytest.mark.asyncio
async def test_delete_rss_keeps_rule_until_its_last_exact_source(database: AsyncEngine):
    url = "https://rss.example.test/show.xml"
    other_url = "https://rss.example.test/other.xml"
    async with AsyncSession(database, expire_on_commit=False) as db:
        bangumi_repository = BangumiDatabase(db)
        torrent_repository = TorrentDatabase(db)
        rss_repository = RSSDatabase(db)
        rss_items = [RSSItem(url=url), RSSItem(url=other_url)]
        for rss in rss_items:
            assert await rss_repository.add(rss)
        rule = Bangumi(title_raw="Example Show")
        await add_rule_with_rss(db, rule, rss_items)
        await db.commit()
        assert rule.id is not None
        torrent = Torrent(
            bangumi_id=rule.id,
            name="Example Show S01E01",
            url="https://torrent.test/1",
        )
        await torrent_repository.add(torrent)
        await db.commit()

        assert rss_items[0].id is not None
        async with AsyncSession(database, expire_on_commit=False) as session:
            result = await RssService(session).delete_one(rss_items[0].id)
            assert result.status
        async with AsyncSession(database, expire_on_commit=False) as check:
            bangumi_repository = BangumiDatabase(check)
            torrent_repository = TorrentDatabase(check)
            retained = await bangumi_repository.search_id(rule.id)
            assert retained is not None
            assert [item.url for item in retained.rss_items] == [other_url]
            assert len(await torrent_repository.search_bangumi(rule.id)) == 1

        assert rss_items[1].id is not None
        async with AsyncSession(database, expire_on_commit=False) as session:
            result = await RssService(session).delete_one(rss_items[1].id)
            assert result.status
        async with AsyncSession(database, expire_on_commit=False) as check:
            bangumi_repository = BangumiDatabase(check)
            torrent_repository = TorrentDatabase(check)
            assert await bangumi_repository.search_id(rule.id) is None
            assert await torrent_repository.search_bangumi(rule.id) == []


@pytest.mark.asyncio
async def test_delete_aggregate_rss_cascades_to_orphaned_rules(database: AsyncEngine):
    url = "https://rss.example.test/aggregate.xml"
    async with AsyncSession(database, expire_on_commit=False) as db:
        bangumi_repository = BangumiDatabase(db)
        torrent_repository = TorrentDatabase(db)
        rss_repository = RSSDatabase(db)
        rss = RSSItem(url=url, aggregate=True)
        assert await rss_repository.add(rss)
        rules = [
            Bangumi(title_raw="First Show"),
            Bangumi(title_raw="Second Show"),
        ]
        for rule in rules:
            await add_rule_with_rss(db, rule, [rss])
            await db.commit()
            assert rule.id is not None
            await torrent_repository.add(
                Torrent(
                    bangumi_id=rule.id,
                    name=f"{rule.title_raw} S01E01",
                    url=f"https://torrent.test/{rule.id}",
                )
            )

        assert rss.id is not None
        async with AsyncSession(database, expire_on_commit=False) as session:
            result = await RssService(session).delete_one(rss.id)
            assert result.status
        async with AsyncSession(database, expire_on_commit=False) as check:
            bangumi_repository = BangumiDatabase(check)
            torrent_repository = TorrentDatabase(check)
            rss_repository = RSSDatabase(check)
            assert await rss_repository.search_id(rss.id) is None
            for rule in rules:
                assert rule.id is not None
                assert await bangumi_repository.search_id(rule.id) is None
                assert await torrent_repository.search_bangumi(rule.id) == []


@pytest.mark.asyncio
async def test_delete_rss_batch_with_missing_id_leaves_everything_unchanged(
    database: AsyncEngine,
):
    async with AsyncSession(database, expire_on_commit=False) as db:
        bangumi_repository = BangumiDatabase(db)
        torrent_repository = TorrentDatabase(db)
        rss_repository = RSSDatabase(db)
        rss_items = [
            RSSItem(url="https://rss.example.test/first.xml"),
            RSSItem(url="https://rss.example.test/second.xml"),
        ]
        rules = []
        for index, rss in enumerate(rss_items):
            assert await rss_repository.add(rss)
            rule = Bangumi(title_raw=f"Show {index}")
            await add_rule_with_rss(db, rule, [rss])
            await db.commit()
            assert rule.id is not None
            rules.append(rule)
            await torrent_repository.add(
                Torrent(
                    bangumi_id=rule.id,
                    name=f"Show {index} S01E01",
                    url=f"https://torrent.test/{index}",
                )
            )

        ids = [rss.id for rss in rss_items if rss.id is not None]
        assert len(ids) == len(rss_items)
        async with AsyncSession(database, expire_on_commit=False) as session:
            result = await RssService(session).delete_many([*ids, 999_999])
            assert not result.status
        assert len(await rss_repository.search_all()) == 2
        for rule in rules:
            assert rule.id is not None
            assert await bangumi_repository.search_id(rule.id) is not None
            assert len(await torrent_repository.search_bangumi(rule.id)) == 1


@pytest.mark.asyncio
async def test_manual_rule_deletion_preserves_shared_aggregate_and_deletes_regular_rss(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
    tag_calls: list[tuple[set[str], str]] = []

    class DownloadClientStub:
        async def __aenter__(self) -> DownloadClientStub:
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def set_tag(self, hashes: set[str], tag: str) -> None:
            tag_calls.append((hashes, tag))

    monkeypatch.setattr("module.service.bangumi.DownloadClient", DownloadClientStub)
    async with AsyncSession(database, expire_on_commit=False) as manager:
        bangumi_repository = BangumiDatabase(manager)
        torrent_repository = TorrentDatabase(manager)
        rss_repository = RSSDatabase(manager)
        aggregate = RSSItem(url="https://rss.example.test/shared.xml", aggregate=True)
        regular = RSSItem(url="https://rss.example.test/rule.xml")
        assert await rss_repository.add(aggregate)
        assert await rss_repository.add(regular)
        first = Bangumi(title_raw="First Show", offset=1)
        second = Bangumi(title_raw="Second Show")
        await add_rule_with_rss(manager, first, [aggregate, regular])
        await add_rule_with_rss(manager, second, [aggregate])
        await manager.commit()
        assert first.id is not None
        assert second.id is not None
        await torrent_repository.add(
            Torrent(
                bangumi_id=first.id,
                name="First Show S01E01",
                url="https://torrent.test/first",
                hash="hash-first",
            )
        )
        await torrent_repository.add(
            Torrent(
                bangumi_id=first.id,
                name="First Show S01E02",
                url="https://torrent.test/second",
                hash="hash-second",
            )
        )

        result = await BangumiService(manager).delete_one(first.id)

        assert result.status
        assert tag_calls == [({"hash-first", "hash-second"}, "ab-offset=1")]
        assert await rss_repository.search_url(aggregate.url) is not None
        assert await rss_repository.search_url(regular.url) is None
        assert await torrent_repository.search_bangumi(first.id) == []
        remaining = await bangumi_repository.search_id(second.id)
        assert remaining is not None
        assert [item.url for item in remaining.rss_items] == [aggregate.url]


@pytest.mark.asyncio
async def test_rule_deletion_keeps_offset_tag_when_commit_fails(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
    tag_calls: list[tuple[set[str], str]] = []

    class DownloadClientStub:
        async def __aenter__(self) -> DownloadClientStub:
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def set_tag(self, hashes: set[str], tag: str) -> None:
            tag_calls.append((hashes, tag))

    monkeypatch.setattr("module.service.bangumi.DownloadClient", DownloadClientStub)

    async with AsyncSession(database, expire_on_commit=False) as manager:
        bangumi_repository = BangumiDatabase(manager)
        torrent_repository = TorrentDatabase(manager)
        rule = Bangumi(title_raw="Example Show", offset=1)
        await bangumi_repository.add(rule)
        await manager.commit()
        assert rule.id is not None
        rule_id = rule.id
        await torrent_repository.add(
            Torrent(
                bangumi_id=rule.id,
                name="Example Show S01E01",
                url="https://torrent.test/1",
                hash="hash-first",
            )
        )
        await manager.commit()

        async def fail_commit() -> None:
            raise RuntimeError("commit failed")

        monkeypatch.setattr(manager, "commit", fail_commit)
        result = await BangumiService(manager).delete_one(rule_id)

        assert not result.status
        assert result.status_code == 500
        assert tag_calls == [({"hash-first"}, "ab-offset=1")]
        assert await bangumi_repository.search_id(rule_id) is not None
        assert len(await torrent_repository.search_bangumi(rule_id)) == 1


@pytest.mark.asyncio
async def test_rule_enable_disable_toggles_associated_regular_rss_only(
    database: AsyncEngine,
):
    regular_url = "https://rss.example.test/regular.xml"
    aggregate_url = "https://rss.example.test/aggregate.xml"
    async with AsyncSession(database, expire_on_commit=False) as manager:
        bangumi_repository = BangumiDatabase(manager)
        rss_repository = RSSDatabase(manager)
        regular = RSSItem(url=regular_url)
        aggregate = RSSItem(url=aggregate_url, aggregate=True)
        for rss in (regular, aggregate):
            assert await rss_repository.add(rss)
        rule = Bangumi(title_raw="Example Show")
        await add_rule_with_rss(manager, rule, [regular, aggregate])
        await manager.commit()
        assert rule.id is not None

        service = TorrentService(manager)
        assert (await service.disable_rule(rule.id)).status
        disabled_rule = await bangumi_repository.search_id(rule.id)
        disabled_rss = await rss_repository.search_url(regular_url)
        untouched_aggregate = await rss_repository.search_url(aggregate_url)
        assert disabled_rule is not None and disabled_rule.deleted is True
        assert disabled_rss is not None and disabled_rss.enabled is False
        assert untouched_aggregate is not None and untouched_aggregate.enabled is True

        assert (await service.enable_rule(rule.id)).status
        enabled_rule = await bangumi_repository.search_id(rule.id)
        enabled_rss = await rss_repository.search_url(regular_url)
        untouched_aggregate = await rss_repository.search_url(aggregate_url)
        assert enabled_rule is not None and enabled_rule.deleted is False
        assert enabled_rss is not None and enabled_rss.enabled is True
        assert untouched_aggregate is not None and untouched_aggregate.enabled is True
