from collections.abc import AsyncIterator
from typing import cast

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


@pytest.mark.asyncio
async def test_search_rss_matches_exact_url_members(database: AsyncEngine):
    url = "https://rss.example.test/show.xml"
    async with AsyncSession(database, expire_on_commit=False) as db:
        bangumi_repository = BangumiDatabase(db)
        for title, rss_link in (
            ("empty", ""),
            ("single", url),
            ("multiple", f"https://rss.example.test/other.xml,{url}"),
            ("similar", f"{url}-backup"),
        ):
            await bangumi_repository.add(Bangumi(title_raw=title, rss_link=rss_link))

        matches = await bangumi_repository.search_rss(url)

        assert {bangumi.title_raw for bangumi in matches} == {"single", "multiple"}
        assert await bangumi_repository.search_rss("") == []


@pytest.mark.asyncio
async def test_analyze_feed_returns_exact_match(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
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
        parsed = Bangumi(
            title_raw="Example Show",
            season=1,
            season_raw="S01",
            group_name="Group A",
        )

        async def link_to_data(_rss_item: RSSItem) -> Bangumi:
            return parsed

        monkeypatch.setattr(service.analyser, "link_to_data", link_to_data)
        result = await service.analyze_feed(RSSItem(url="https://rss.example.test/a"))

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
    candidates = [
        Bangumi(title_raw="Example Show", season=1, group_name=group)
        for group in ("Group A", "Group B")
    ]
    parsed = Bangumi(
        title_raw="Example Show",
        season=1,
        season_raw="S01",
        group_name="Group C",
    )

    async with AsyncSession(database, expire_on_commit=False) as db:
        await BangumiDatabase(db).add_all(candidates)
        await db.commit()
        service = RssService(db)

        async def link_to_data(_rss_item: RSSItem) -> Bangumi:
            return parsed

        monkeypatch.setattr(service.analyser, "link_to_data", link_to_data)
        result = await service.analyze_feed(
            RSSItem(url="https://rss.example.test/candidates")
        )

    assert isinstance(result, RSSAnalysisResult)
    assert {
        option.bangumi.group_name
        for option in result.options
        if option.type == "candidate"
    } == {"Group A", "Group B"}
    assert result.options[-1] == RSSAnalysisOption(
        type="create", bangumi=BangumiData.from_bangumi(parsed)
    )


@pytest.mark.asyncio
async def test_aggregate_refresh_links_torrent_to_created_rule(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
    torrent = Torrent(name="Example Show S01E01", url="https://torrent.test/1")
    parsed = Bangumi(title_raw="Example Show", season=1, group_name="Example Group")
    downloads: list[tuple[str, int | None]] = []

    class RequestStub:
        async def __aenter__(self) -> RequestStub:
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def get_torrents(self, _url: str) -> list[Torrent]:
            return [torrent]

    class DownloadClientStub:
        async def add_torrent(self, torrent: Torrent, bangumi: Bangumi) -> bool:
            downloads.append((torrent.url, bangumi.id))
            return True

    monkeypatch.setattr(rss_service_module, "RequestContent", RequestStub)

    async with AsyncSession(database, expire_on_commit=False) as db:
        service = RssService(db)

        async def raw_parser(*, raw: str) -> Bangumi:
            assert raw == torrent.name
            return parsed

        monkeypatch.setattr(service.analyser, "raw_parser", raw_parser)
        await service.refresh_aggregate_rss(
            RSSItem(
                url="https://rss.example.test/aggregate.xml",
                aggregate=True,
                parser="custom",
            ),
            cast(DownloadClient, DownloadClientStub()),
        )
        rules = await service.bangumi.search_all()
        saved_torrents = await service.torrent.search_all()

    assert len(rules) == 1
    assert torrent.bangumi_id == rules[0].id
    assert saved_torrents == [torrent]
    assert downloads == [(torrent.url, rules[0].id)]


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
            rss_link=url,
            filter="1080p,\\d+-\\d+",
        )
        rss_item = RSSItem(url=url)
        await BangumiDatabase(db).add(rule)
        assert await RSSDatabase(db).add(rss_item)
        await db.commit()
        service = RssService(db)
        await service.refresh_regular_rss(
            rss_item, cast(DownloadClient, DownloadClientStub())
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

        async def search_active() -> list[RSSItem]:
            return [regular, aggregate]

        async def refresh_aggregate(rss_item: RSSItem, _client: object) -> None:
            aggregate_calls.append(rss_item.url)

        monkeypatch.setattr(service.rss, "search_active", search_active)
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
        rule = Bangumi(title_raw="Example Show", rss_link=f"{url},{other_url}")
        await bangumi_repository.add(rule)
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
            assert retained.rss_link == other_url
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
            Bangumi(title_raw="First Show", rss_link=url),
            Bangumi(title_raw="Second Show", rss_link=url),
        ]
        for rule in rules:
            await bangumi_repository.add(rule)
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
            rule = Bangumi(title_raw=f"Show {index}", rss_link=rss.url)
            await bangumi_repository.add(rule)
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
        first = Bangumi(
            title_raw="First Show", rss_link=f"{aggregate.url},{regular.url}", offset=1
        )
        second = Bangumi(title_raw="Second Show", rss_link=aggregate.url)
        await bangumi_repository.add(first)
        await bangumi_repository.add(second)
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
        assert remaining.rss_link == aggregate.url


@pytest.mark.asyncio
async def test_zero_offset_rule_deletion_skips_download_client(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
    def unexpected_download_client() -> None:
        pytest.fail("zero-offset deletion must not use the download client")

    monkeypatch.setattr(
        "module.service.bangumi.DownloadClient", unexpected_download_client
    )

    async with AsyncSession(database, expire_on_commit=False) as manager:
        bangumi_repository = BangumiDatabase(manager)
        torrent_repository = TorrentDatabase(manager)
        rule = Bangumi(title_raw="Example Show", offset=0)
        await bangumi_repository.add(rule)
        await manager.commit()
        assert rule.id is not None
        await torrent_repository.add(
            Torrent(
                bangumi_id=rule.id,
                name="Example Show S01E01",
                url="https://torrent.test/1",
                hash="hash-first",
            )
        )
        await manager.commit()

        result = await BangumiService(manager).delete_one(rule.id)

        assert result.status
        assert await torrent_repository.search_bangumi(rule.id) == []


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
        for rss in (
            RSSItem(url=regular_url),
            RSSItem(url=aggregate_url, aggregate=True),
        ):
            assert await rss_repository.add(rss)
        rule = Bangumi(
            title_raw="Example Show", rss_link=f"{regular_url},{aggregate_url}"
        )
        await bangumi_repository.add(rule)
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
