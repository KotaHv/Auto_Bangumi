import importlib

import pytest
from fastapi import Depends
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine
from sse_starlette.sse import EventSourceResponse

from module.database import Database
from module.database.alembic import upgrade_database
from module.security import session as session_security
from module.security.session import (
    SESSION_TIMEOUT,
    generate_session_token,
    hash_session_token,
    require_session,
)


def load_app(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "dist" / "assets").mkdir(parents=True)
    (tmp_path / "dist" / "images").mkdir()
    main = importlib.import_module("main")
    return main.create_app()


def test_state_changing_routes_use_mutation_methods(tmp_path, monkeypatch):
    app = load_app(tmp_path, monkeypatch)
    paths = app.openapi()["paths"]

    expected = {
        "/api/v1/restart": "post",
        "/api/v1/start": "post",
        "/api/v1/stop": "post",
        "/api/v1/shutdown": "post",
        "/api/v1/rss/refresh/all": "post",
        "/api/v1/rss/refresh/{rss_id}": "post",
        "/api/v1/bangumi/enable/{bangumi_id}": "post",
        "/api/v1/bangumi/disable/{bangumi_id}": "post",
        "/api/v1/bangumi/disable/many": "post",
        "/api/v1/bangumi/refresh/poster/all": "post",
        "/api/v1/bangumi/refresh/poster/{bangumi_id}": "post",
        "/api/v1/bangumi/delete/all": "delete",
    }
    for path, method in expected.items():
        assert method in paths[path]
        assert "get" not in paths[path]

    assert {"get", "delete"} <= set(paths["/api/v1/log"])


@pytest.mark.asyncio
async def test_api_requests_reject_cross_site_browser_requests(tmp_path, monkeypatch):
    app = load_app(tmp_path, monkeypatch)

    @app.get("/api/policy-read")
    async def policy_read():
        return {"ok": True}

    @app.post("/api/policy-write")
    async def policy_write():
        return {"ok": True}

    @app.get("/apix")
    async def non_api_path():
        return {"ok": True}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        assert (
            await client.get(
                "/api/policy-read", headers={"Origin": "https://evil.example"}
            )
        ).status_code == 403
        assert (
            await client.get(
                "/api/policy-read", headers={"Origin": "http://testserver"}
            )
        ).status_code == 200
        assert (
            await client.get("/apix", headers={"Origin": "https://evil.example"})
        ).status_code == 200
        assert (
            await client.get(
                "/api/policy-read", headers={"Origin": "http://testserver:invalid"}
            )
        ).status_code == 403
        assert (await client.post("/api/policy-write")).status_code == 200
        assert (
            await client.post(
                "/api/policy-write", headers={"Origin": "https://evil.example"}
            )
        ).status_code == 403
        assert (
            await client.post(
                "/api/policy-write",
                headers={"Origin": "http://testserver"},
            )
        ).status_code == 200
        assert (
            await client.post(
                "/api/policy-write",
                headers={"Sec-Fetch-Site": "cross-site"},
            )
        ).status_code == 403
        assert (
            await client.post(
                "/api/policy-write",
                headers={"Sec-Fetch-Site": "same-origin"},
            )
        ).status_code == 200
        assert (
            await client.post(
                "/api/policy-write",
                headers={"Sec-Fetch-Site": "same-site"},
            )
        ).status_code == 403
        assert (
            await client.post(
                "/api/policy-write",
                headers={"Referer": "http://testserver/settings"},
            )
        ).status_code == 200
        assert (
            await client.post(
                "/api/policy-write",
                headers={"Referer": "https://evil.example/settings"},
            )
        ).status_code == 403
        assert (
            await client.post(
                "/api/policy-write",
                headers={"Referer": "http://testserver:invalid/settings"},
            )
        ).status_code == 403


@pytest.mark.asyncio
async def test_sse_auth_renews_cookie_on_final_response(tmp_path, monkeypatch):
    app = load_app(tmp_path, monkeypatch)
    database_path = tmp_path / "session.db"
    async_engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}")
    await upgrade_database(async_engine)
    raw_token = generate_session_token()
    async with Database(async_engine) as db:
        await db.sessions.create(
            token_hash=hash_session_token(raw_token),
            created_at=1000,
            expires_at=1000 + SESSION_TIMEOUT,
        )
        await db.commit()
    monkeypatch.setattr(session_security, "Database", lambda: Database(async_engine))
    monkeypatch.setattr(session_security.time, "time", lambda: 1000)

    @app.get("/policy-stream", dependencies=[Depends(require_session)])
    async def policy_stream():
        async def events():
            yield {"data": "ok"}

        return EventSourceResponse(events())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        streamed = await client.get(
            "/policy-stream", headers={"Cookie": f"session={raw_token}"}
        )
        assert streamed.status_code == 200
        assert streamed.headers["content-type"].startswith("text/event-stream")
        assert "set-cookie" in streamed.headers
        assert "Max-Age=3600" in streamed.headers["set-cookie"]

        rejected = await client.get(
            "/policy-stream",
            headers={"Cookie": f"session={generate_session_token()}"},
        )
        assert rejected.status_code == 401

    await async_engine.dispose()
