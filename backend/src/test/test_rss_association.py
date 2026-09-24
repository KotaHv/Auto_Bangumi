from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.pool import StaticPool

from module.database.combine import Database
from module.downloader.download_client import DownloadClient
from module.models import Bangumi, RSSItem, Torrent
from module.rss import engine as rss_engine_module
from module.rss.engine import RSSEngine


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
        rule = Bangumi(
            title_raw="Example Show",
            rss_link=f"{url}-backup",
        )
        await db.bangumi.add(rule)
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
        assert stored.rss_link.split(",").count("") == 0


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

    monkeypatch.setattr(rss_engine_module, "RequestContent", RequestStub)

    async with Database(database) as db:
        await db.bangumi.add(
            Bangumi(
                title_raw="Example Show",
                rss_link=url,
                filter="1080p,\\d+-\\d+",
            )
        )
        async with RSSEngine(database) as engine:
            result = await engine.fetch_regular_rss(RSSItem(url=url))

    assert result == [torrent]
    assert calls == [(url, "1080p|\\d+-\\d+")]


@pytest.mark.asyncio
async def test_unassociated_regular_rss_logs_and_refresh_continues(
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

    monkeypatch.setattr(rss_engine_module, "logger", LoggerStub())
    monkeypatch.setattr(rss_engine_module, "RequestContent", UnexpectedRequest)

    async with RSSEngine(database) as engine:

        async def search_active() -> list[RSSItem]:
            return [regular, aggregate]

        async def fetch_aggregate(rss_item: RSSItem) -> list[Torrent]:
            aggregate_calls.append(rss_item.url)
            return []

        monkeypatch.setattr(engine.rss, "search_active", search_active)
        monkeypatch.setattr(engine, "fetch_aggregate_rss", fetch_aggregate)

        assert await engine.fetch_regular_rss(regular) == []
        await engine.refresh_rss(DownloadClient.__new__(DownloadClient))

    assert any(regular.url in warning for warning in warnings)
    assert aggregate_calls == [aggregate.url]
