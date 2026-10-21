import importlib
import json
from collections.abc import AsyncIterator

import httpx2
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.bangumi import BangumiDatabase
from module.database.deps import get_database
from module.models import Bangumi, RSSItem


def use_transport(monkeypatch, handler):
    original_client = httpx2.AsyncClient
    transport = httpx2.MockTransport(handler)

    def client(*args, **kwargs):
        return original_client(*args, transport=transport, **kwargs)

    monkeypatch.setattr(httpx2, "AsyncClient", client)


def load_search_module(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "config").mkdir(exist_ok=True)
    search_module = importlib.import_module("module.api.search")
    security_module = importlib.import_module("module.security.session")
    return search_module, security_module.require_session


def search_app(search_module, require_session, database: AsyncEngine) -> FastAPI:
    async def override_get_database() -> AsyncIterator[AsyncSession]:
        async with AsyncSession(database) as session:
            yield session

    app = FastAPI()
    app.include_router(search_module.router, prefix="/api/v1")
    app.dependency_overrides[require_session] = lambda: None
    app.dependency_overrides[get_database] = override_get_database
    return app


def data_events(response) -> list[dict]:
    return [
        json.loads(line.removeprefix("data: "))
        for line in response.text.splitlines()
        if line.startswith("data: ") and line != "data: "
    ]


@pytest.mark.asyncio
@pytest.mark.parametrize("keywords", [None, "", "   "])
async def test_search_rejects_missing_or_blank_keywords(
    tmp_path, monkeypatch, database, keywords
):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)
    params = {} if keywords is None else {"keywords": keywords}
    async with AsyncClient(
        transport=ASGITransport(
            app=search_app(search_module, require_session, database)
        ),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/search/bangumi", params=params)

    assert response.status_code == 422
    assert not response.headers.get("content-type", "").startswith("text/event-stream")


@pytest.mark.asyncio
async def test_search_reports_invalid_provider(tmp_path, monkeypatch, database):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)
    async with AsyncClient(
        transport=ASGITransport(
            app=search_app(search_module, require_session, database)
        ),
        base_url="http://testserver",
    ) as client:
        response = await client.get(
            "/api/v1/search/bangumi?site=unsupported&keywords=test"
        )

    assert "event: failure" in response.text
    assert 'data: {"code": "invalid_provider"}' in response.text


@pytest.mark.asyncio
async def test_search_keeps_authentication_at_stream_start(tmp_path, monkeypatch):
    search_module, _ = load_search_module(tmp_path, monkeypatch)
    app = FastAPI()
    app.include_router(search_module.router, prefix="/api/v1")
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        response = await client.get("/api/v1/search/bangumi?keywords=test")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_search_streams_one_result_per_rss_link(tmp_path, monkeypatch, database):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)
    tmdb_searches = 0
    feed = (
        "<rss><channel>"
        "<item><title>[Lilith-Raws] Example Show S01E01 [Baha][WEB-DL]"
        "[1080p][AVC AAC][CHT][MP4]</title></item>"
        "<item><title>[Lilith-Raws] Example Show S01E02 [Baha][WEB-DL]"
        "[1080p][AVC AAC][CHT][MP4]</title></item>"
        "<item><title>[ANi] Example Show S01E01 [1080P][Baha][WEB-DL]"
        "[AAC AVC][CHT][MP4]</title></item>"
        "</channel></rss>"
    )

    async def handler(request):
        nonlocal tmdb_searches
        if request.url.path == "/RSS/Search":
            return httpx2.Response(200, text=feed)
        if request.url.path == "/3/search/tv":
            tmdb_searches += 1
            return httpx2.Response(200, json={"results": [{"id": 1}]})
        if request.url.path == "/3/tv/1":
            return httpx2.Response(
                200,
                json={
                    "genres": [{"id": 16}],
                    "seasons": [],
                    "name": "Example Show",
                    "original_name": "Example Show",
                    "first_air_date": "2024-01-01",
                    "poster_path": None,
                },
            )
        raise AssertionError(f"unexpected request: {request.url}")

    async with AsyncSession(database, expire_on_commit=False) as db:
        rule = Bangumi(
            official_title="Example Show",
            title_raw="Example Show",
            season=1,
            season_raw="S01",
            group_name="Lilith-Raws",
            rss_items=[RSSItem(url="https://rss.example.test/lilith")],
        )
        await BangumiDatabase(db).add(rule)
        await db.commit()
        rule_id = rule.id

    use_transport(monkeypatch, handler)
    async with AsyncClient(
        transport=ASGITransport(
            app=search_app(search_module, require_session, database)
        ),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/search/bangumi?keywords=example")

    results = data_events(response)
    assert response.headers["content-type"].startswith("text/event-stream")
    assert len(results) == 2
    assert len({result["rss"]["url"] for result in results}) == 2

    lilith, ani = results
    assert [option["type"] for option in lilith["options"]] == ["exact_match"]
    assert lilith["options"][0]["bangumi"]["id"] == rule_id

    candidate = next(
        option for option in ani["options"] if option["type"] == "candidate"
    )
    create = next(option for option in ani["options"] if option["type"] == "create")
    assert {option["type"] for option in ani["options"]} == {"candidate", "create"}
    assert candidate["bangumi"]["id"] == rule_id
    assert create["bangumi"]["official_title"] == "Example Show"
    assert create["bangumi"]["year"] == "2024"
    assert create["bangumi"]["rss_links"] == [ani["rss"]["url"]]
    assert tmdb_searches == 1
    assert "event: complete\r\ndata: \r\n\r\n" in response.text


@pytest.mark.asyncio
async def test_search_with_no_provider_results_completes(
    tmp_path, monkeypatch, database
):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)

    async def handler(_request):
        return httpx2.Response(200, text="<rss><channel></channel></rss>")

    use_transport(monkeypatch, handler)
    async with AsyncClient(
        transport=ASGITransport(
            app=search_app(search_module, require_session, database)
        ),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/search/bangumi?keywords=test")

    assert response.status_code == 200
    assert data_events(response) == []
    assert "event: complete\r\ndata: \r\n\r\n" in response.text


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "feed",
    [
        "<rss><channel><item>",
        "<rss><channel><item /></channel></rss>",
    ],
)
async def test_search_reports_unavailable_feeds(tmp_path, monkeypatch, database, feed):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)

    async def handler(_request):
        return httpx2.Response(200, text=feed)

    use_transport(monkeypatch, handler)
    async with AsyncClient(
        transport=ASGITransport(
            app=search_app(search_module, require_session, database)
        ),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/search/bangumi?keywords=test")

    assert "event: failure" in response.text
    assert 'data: {"code": "upstream_unavailable"}' in response.text
