import importlib
import xml.etree.ElementTree

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


class SearchStub:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return None


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


@pytest.mark.asyncio
async def test_search_streams_results_then_complete(tmp_path, monkeypatch):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)

    class ResultsSearch(SearchStub):
        async def analyse_keyword(self, keywords, site):
            yield '{"id": 1}'
            yield '{"id": 2}'

    monkeypatch.setattr(search_module, "SearchTorrent", ResultsSearch)
    async with AsyncClient(
        transport=ASGITransport(app=search_app(search_module, require_session)),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/search/bangumi?keywords=test")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.text.count('data: {"id":') == 2
    assert "event: complete\r\ndata: \r\n\r\n" in response.text


@pytest.mark.asyncio
@pytest.mark.parametrize("keywords", [None, "", "   "])
async def test_search_rejects_missing_or_blank_keywords(tmp_path, monkeypatch, keywords):
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
async def test_search_with_no_provider_results_completes(
    tmp_path, monkeypatch
):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)

    class EmptySearch(SearchStub):
        async def analyse_keyword(self, keywords, site):
            if False:
                yield ""

    monkeypatch.setattr(search_module, "SearchTorrent", EmptySearch)
    async with AsyncClient(
        transport=ASGITransport(app=search_app(search_module, require_session)),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/search/bangumi?keywords=test")

    assert response.status_code == 200
    assert "event: complete\r\ndata: \r\n\r\n" in response.text


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
async def test_search_reports_upstream_failure(tmp_path, monkeypatch):
    search_module, require_session = load_search_module(tmp_path, monkeypatch)
    network_module = importlib.import_module("module.network")

    class UpstreamFailureSearch(SearchStub):
        async def analyse_keyword(self, keywords, site):
            raise network_module.UpstreamUnavailableError
            yield ""

    monkeypatch.setattr(search_module, "SearchTorrent", UpstreamFailureSearch)
    async with AsyncClient(
        transport=ASGITransport(app=search_app(search_module, require_session)),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/api/v1/search/bangumi?keywords=test")

    assert "event: failure" in response.text
    assert 'data: {"code": "upstream_unavailable"}' in response.text


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
async def test_title_search_generates_one_poster_per_anime(tmp_path, monkeypatch):
    load_search_module(tmp_path, monkeypatch)
    models = importlib.import_module("module.models")
    searcher_module = importlib.import_module("module.searcher.searcher")
    searcher = searcher_module.SearchTorrent()
    feed = xml.etree.ElementTree.fromstring(
        "<rss><channel><item><title>Group A release</title></item>"
        "<item><title>Group B release</title></item></channel></rss>"
    )
    poster_calls = 0

    async def get_xml(*_args, **_kwargs):
        return feed

    async def raw_parser(*, raw):
        return models.Bangumi(
            official_title="Demo title",
            title_raw="Demo title",
            group_name=raw,
            filter="",
        )

    async def tmdb_parser(title, season, _language):
        nonlocal poster_calls
        poster_calls += 1
        return title, season, "2025", "https://example.com/poster.jpg"

    monkeypatch.setattr(searcher, "get_xml", get_xml)
    monkeypatch.setattr(searcher, "raw_parser", raw_parser)
    monkeypatch.setattr(searcher, "tmdb_parser", tmdb_parser)
    results = [
        item
        async for item in searcher.analyse_keyword(keywords=["demo"], site="mikan")
    ]

    assert len(results) == 2
    assert poster_calls == 1


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "feed", [None, xml.etree.ElementTree.fromstring("<rss><channel><item /></channel></rss>")]
)
async def test_title_search_reports_unavailable_feeds(tmp_path, monkeypatch, feed):
    load_search_module(tmp_path, monkeypatch)
    network_module = importlib.import_module("module.network")
    searcher_module = importlib.import_module("module.searcher.searcher")
    searcher = searcher_module.SearchTorrent()

    async def get_xml(*_args, **_kwargs):
        return feed

    monkeypatch.setattr(searcher, "get_xml", get_xml)
    with pytest.raises(network_module.UpstreamUnavailableError):
        await searcher._get_titles(searcher_module.search_url("mikan", ["demo"]))
