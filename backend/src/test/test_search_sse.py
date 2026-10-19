import importlib
import json

import httpx2
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


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


def search_app(search_module, require_session) -> FastAPI:
    app = FastAPI()
    app.include_router(search_module.router, prefix="/api/v1")
    app.dependency_overrides[require_session] = lambda: None
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
    tmp_path, monkeypatch, keywords
):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)
    params = {} if keywords is None else {"keywords": keywords}
    async with AsyncClient(
        transport=ASGITransport(app=search_app(search_module, require_session)),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/search/bangumi", params=params)

    assert response.status_code == 422
    assert not response.headers.get("content-type", "").startswith("text/event-stream")


@pytest.mark.asyncio
async def test_search_reports_invalid_provider(tmp_path, monkeypatch):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)
    async with AsyncClient(
        transport=ASGITransport(app=search_app(search_module, require_session)),
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
async def test_search_streams_one_result_per_rss_link(tmp_path, monkeypatch):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)
    tmdb_searches = 0
    feed = (
        "<rss><channel>"
        "<item><title>[Lilith-Raws] Sousou no Frieren - 01 [Baha][WEB-DL]"
        "[1080p][AVC AAC][CHT][MP4]</title></item>"
        "<item><title>[Lilith-Raws] Sousou no Frieren - 02 [Baha][WEB-DL]"
        "[1080p][AVC AAC][CHT][MP4]</title></item>"
        "<item><title>[ANi] Sousou no Frieren - 01 [1080P][Baha][WEB-DL]"
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
                    "name": "Sousou no Frieren",
                    "original_name": "Sousou no Frieren",
                    "first_air_date": "2023-09-29",
                    "poster_path": None,
                },
            )
        raise AssertionError(f"unexpected request: {request.url}")

    use_transport(monkeypatch, handler)
    async with AsyncClient(
        transport=ASGITransport(app=search_app(search_module, require_session)),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/search/bangumi?keywords=frieren")

    results = data_events(response)
    assert response.headers["content-type"].startswith("text/event-stream")
    assert len(results) == 2
    assert len({result["rss"]["url"] for result in results}) == 2
    assert {result["bangumi"]["official_title"] for result in results} == {
        "Sousou no Frieren"
    }
    assert {result["bangumi"]["year"] for result in results} == {"2023"}
    assert tmdb_searches == 1
    assert "event: complete\r\ndata: \r\n\r\n" in response.text


@pytest.mark.asyncio
async def test_search_with_no_provider_results_completes(tmp_path, monkeypatch):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)

    async def handler(_request):
        return httpx2.Response(200, text="<rss><channel></channel></rss>")

    use_transport(monkeypatch, handler)
    async with AsyncClient(
        transport=ASGITransport(app=search_app(search_module, require_session)),
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
async def test_search_reports_unavailable_feeds(tmp_path, monkeypatch, feed):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)

    async def handler(_request):
        return httpx2.Response(200, text=feed)

    use_transport(monkeypatch, handler)
    async with AsyncClient(
        transport=ASGITransport(app=search_app(search_module, require_session)),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/search/bangumi?keywords=test")

    assert "event: failure" in response.text
    assert 'data: {"code": "upstream_unavailable"}' in response.text
