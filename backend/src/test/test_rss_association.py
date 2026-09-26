from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.pool import StaticPool

from module.database.combine import Database
from module.models import Bangumi, RSSItem, Torrent
from module.service import rss as rss_service_module
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
    async with Database(database) as db:
        for title, rss_link in (
            ("empty", ""),
            ("single", url),
            ("multiple", f"https://rss.example.test/other.xml,{url}"),
            ("similar", f"{url}-backup"),
        ):
            await db.bangumi.add(Bangumi(title_raw=title, rss_link=rss_link))

        matches = await db.bangumi.search_rss(url)

        assert {bangumi.title_raw for bangumi in matches} == {"single", "multiple"}
        assert await db.bangumi.search_rss("") == []


@pytest.mark.asyncio
async def test_match_list_appends_exact_url_once_and_ignores_empty_url(
    database: AsyncEngine,
):
    url = "https://rss.example.test/show.xml"
    async with Database(database) as db:
        rule = Bangumi(title_raw="Example Show", rss_link=f"{url}-backup")
        await db.bangumi.add(rule)
        await db.commit()
        assert rule.id is not None

        first = Torrent(name="Example Show S01E01", url="https://torrent.test/1")
        assert await db.bangumi.match_list([first], url) == []
        stored = await db.bangumi.search_id(rule.id)
        assert stored is not None
        assert stored.rss_link == f"{url}-backup,{url}"

        second = Torrent(name="Example Show S01E02", url="https://torrent.test/2")
        assert await db.bangumi.match_list([second], url) == []
        stored = await db.bangumi.search_id(rule.id)
        assert stored is not None
        assert stored.rss_link.split(",").count(url) == 1

        assert (
            await db.bangumi.match_list(
                [Torrent(name="Example Show S01E03", url="https://torrent.test/3")], ""
            )
            == []
        )
        stored = await db.bangumi.search_id(rule.id)
        assert stored is not None
        assert "" not in stored.rss_link.split(",")


@pytest.mark.asyncio
async def test_fetch_regular_rss_keeps_single_link_network_behavior(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
    url = "https://rss.example.test/show.xml"
    torrent = Torrent(name="Example Show S01E01", url="https://torrent.test/1")
    calls: list[tuple[str, str | None]] = []

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

    monkeypatch.setattr(rss_service_module, "RequestContent", RequestStub)

    async with Database(database) as db:
        await db.bangumi.add(
            Bangumi(title_raw="Example Show", rss_link=url, filter="1080p,\\d+-\\d+")
        )
        result = await RssService(db).fetch_regular_rss(RSSItem(url=url))

    assert result == [torrent]
    assert calls == [(url, "1080p|\\d+-\\d+")]


@pytest.mark.asyncio
async def test_unassociated_regular_rss_does_not_block_aggregate_refresh(
    database: AsyncEngine, monkeypatch: pytest.MonkeyPatch
):
    regular = RSSItem(url="https://rss.example.test/unassociated.xml")
    aggregate = RSSItem(url="https://rss.example.test/aggregate.xml", aggregate=True)
    warnings: list[str] = []
    aggregate_calls: list[str] = []

    class LoggerStub:
        def debug(self, *args: object) -> None:
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

    async with Database(database) as db:
        service = RssService(db)

        async def search_active() -> list[RSSItem]:
            return [regular, aggregate]

        async def fetch_aggregate(rss_item: RSSItem) -> list[Torrent]:
            aggregate_calls.append(rss_item.url)
            return []

        monkeypatch.setattr(service.rss, "search_active", search_active)
        monkeypatch.setattr(service, "fetch_aggregate_rss", fetch_aggregate)

        assert await service.fetch_regular_rss(regular) == []
        await service.refresh_rss()

    assert any(regular.url in warning for warning in warnings)
    assert aggregate_calls == [aggregate.url]


@pytest.mark.asyncio
async def test_delete_rss_keeps_rule_until_its_last_exact_source(database: AsyncEngine):
    url = "https://rss.example.test/show.xml"
    other_url = "https://rss.example.test/other.xml"
    async with Database(database) as db:
        rss_items = [RSSItem(url=url), RSSItem(url=other_url)]
        for rss in rss_items:
            assert await db.rss.add(rss)
        rule = Bangumi(title_raw="Example Show", rss_link=f"{url},{other_url}")
        assert await db.bangumi.add(rule)
        await db.commit()
        assert rule.id is not None
        torrent = Torrent(
            bangumi_id=rule.id,
            name="Example Show S01E01",
            url="https://torrent.test/1",
        )
        await db.torrent.add(torrent)
        await db.commit()

        assert rss_items[0].id is not None
        async with Database(database) as session:
            result = await RssService(session).delete_one(rss_items[0].id)
            assert result.status
        async with Database(database) as check:
            retained = await check.bangumi.search_id(rule.id)
            assert retained is not None
            assert retained.rss_link == other_url
            assert len(await check.torrent.search_bangumi(rule.id)) == 1

        assert rss_items[1].id is not None
        async with Database(database) as session:
            result = await RssService(session).delete_one(rss_items[1].id)
            assert result.status
        async with Database(database) as check:
            assert await check.bangumi.search_id(rule.id) is None
            assert await check.torrent.search_bangumi(rule.id) == []


@pytest.mark.asyncio
async def test_delete_aggregate_rss_cascades_to_orphaned_rules(database: AsyncEngine):
    url = "https://rss.example.test/aggregate.xml"
    async with Database(database) as db:
        rss = RSSItem(url=url, aggregate=True)
        assert await db.rss.add(rss)
        rules = [
            Bangumi(title_raw="First Show", rss_link=url),
            Bangumi(title_raw="Second Show", rss_link=url),
        ]
        for rule in rules:
            assert await db.bangumi.add(rule)
            await db.commit()
            assert rule.id is not None
            await db.torrent.add(
                Torrent(
                    bangumi_id=rule.id,
                    name=f"{rule.title_raw} S01E01",
                    url=f"https://torrent.test/{rule.id}",
                )
            )

        assert rss.id is not None
        async with Database(database) as session:
            result = await RssService(session).delete_one(rss.id)
            assert result.status
        async with Database(database) as check:
            assert await check.rss.search_id(rss.id) is None
            for rule in rules:
                assert rule.id is not None
                assert await check.bangumi.search_id(rule.id) is None
                assert await check.torrent.search_bangumi(rule.id) == []


@pytest.mark.asyncio
async def test_delete_rss_batch_with_missing_id_leaves_everything_unchanged(
    database: AsyncEngine,
):
    async with Database(database) as db:
        rss_items = [
            RSSItem(url="https://rss.example.test/first.xml"),
            RSSItem(url="https://rss.example.test/second.xml"),
        ]
        rules = []
        for index, rss in enumerate(rss_items):
            assert await db.rss.add(rss)
            rule = Bangumi(title_raw=f"Show {index}", rss_link=rss.url)
            assert await db.bangumi.add(rule)
            await db.commit()
            assert rule.id is not None
            rules.append(rule)
            await db.torrent.add(
                Torrent(
                    bangumi_id=rule.id,
                    name=f"Show {index} S01E01",
                    url=f"https://torrent.test/{index}",
                )
            )

        ids = [rss.id for rss in rss_items if rss.id is not None]
        assert len(ids) == len(rss_items)
        async with Database(database) as session:
            result = await RssService(session).delete_many([*ids, 999_999])
            assert not result.status
        assert len(await db.rss.search_all()) == 2
        for rule in rules:
            assert rule.id is not None
            assert await db.bangumi.search_id(rule.id) is not None
            assert len(await db.torrent.search_bangumi(rule.id)) == 1


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
    async with Database(database) as manager:
        aggregate = RSSItem(url="https://rss.example.test/shared.xml", aggregate=True)
        regular = RSSItem(url="https://rss.example.test/rule.xml")
        assert await manager.rss.add(aggregate)
        assert await manager.rss.add(regular)
        first = Bangumi(
            title_raw="First Show", rss_link=f"{aggregate.url},{regular.url}", offset=1
        )
        second = Bangumi(title_raw="Second Show", rss_link=aggregate.url)
        assert await manager.bangumi.add(first)
        assert await manager.bangumi.add(second)
        await manager.commit()
        assert first.id is not None
        assert second.id is not None
        await manager.torrent.add(
            Torrent(
                bangumi_id=first.id,
                name="First Show S01E01",
                url="https://torrent.test/first",
                hash="hash-first",
            )
        )
        await manager.torrent.add(
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
        assert await manager.rss.search_url(aggregate.url) is not None
        assert await manager.rss.search_url(regular.url) is None
        assert await manager.torrent.search_bangumi(first.id) == []
        remaining = await manager.bangumi.search_id(second.id)
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

    async with Database(database) as manager:
        rule = Bangumi(title_raw="Example Show", offset=0)
        assert await manager.bangumi.add(rule)
        await manager.commit()
        assert rule.id is not None
        await manager.torrent.add(
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
        assert await manager.torrent.search_bangumi(rule.id) == []


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

    async with Database(database) as manager:
        rule = Bangumi(title_raw="Example Show", offset=1)
        assert await manager.bangumi.add(rule)
        await manager.commit()
        assert rule.id is not None
        rule_id = rule.id
        await manager.torrent.add(
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
        assert await manager.bangumi.search_id(rule_id) is not None
        assert len(await manager.torrent.search_bangumi(rule_id)) == 1


@pytest.mark.asyncio
async def test_rule_enable_disable_toggles_associated_regular_rss_only(
    database: AsyncEngine,
):
    regular_url = "https://rss.example.test/regular.xml"
    aggregate_url = "https://rss.example.test/aggregate.xml"
    async with Database(database) as manager:
        for rss in (
            RSSItem(url=regular_url),
            RSSItem(url=aggregate_url, aggregate=True),
        ):
            assert await manager.rss.add(rss)
        rule = Bangumi(
            title_raw="Example Show", rss_link=f"{regular_url},{aggregate_url}"
        )
        assert await manager.bangumi.add(rule)
        await manager.commit()
        assert rule.id is not None

        service = TorrentService(manager)
        assert (await service.disable_rule(rule.id)).status
        disabled_rule = await manager.bangumi.search_id(rule.id)
        disabled_rss = await manager.rss.search_url(regular_url)
        untouched_aggregate = await manager.rss.search_url(aggregate_url)
        assert disabled_rule is not None and disabled_rule.deleted is True
        assert disabled_rss is not None and disabled_rss.enabled is False
        assert untouched_aggregate is not None and untouched_aggregate.enabled is True

        assert (await service.enable_rule(rule.id)).status
        enabled_rule = await manager.bangumi.search_id(rule.id)
        enabled_rss = await manager.rss.search_url(regular_url)
        untouched_aggregate = await manager.rss.search_url(aggregate_url)
        assert enabled_rule is not None and enabled_rule.deleted is False
        assert enabled_rss is not None and enabled_rss.enabled is True
        assert untouched_aggregate is not None and untouched_aggregate.enabled is True
