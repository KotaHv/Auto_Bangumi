import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

import httpx2
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from module.core.plex_refresh import PlexRefreshWorker
from module.exceptions import PlexDiscoveryError, PlexInputError
from module.models.plex import (
    PinAttempt,
    PlexAuthState,
    PlexConnection,
    PlexRefreshJob,
)
from module.network import plex as plex_network
from module.service.plex import PlexService


@asynccontextmanager
async def database(path: Path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{path}")
    async with engine.begin() as connection:
        await connection.run_sync(SQLModel.metadata.create_all)
    sessions = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        yield sessions
    finally:
        await engine.dispose()


def use_transport(monkeypatch, handler):
    original_client = httpx2.AsyncClient
    transport = httpx2.MockTransport(handler)

    def client(*args, **kwargs):
        return original_client(*args, transport=transport, **kwargs)

    monkeypatch.setattr(plex_network.httpx2, "AsyncClient", client)


@pytest.mark.asyncio
async def test_enable_requires_configuration_and_initial_authorization_clears_it(
    tmp_path, monkeypatch
):
    async with database(tmp_path / "plex.db") as sessions:
        async with sessions() as session:
            connection = PlexConnection(
                client_identifier="client",
                token="account",
                server_token="server",
                server_identifier="pms-1",
                url="http://localhost:32400",
                section_id=1,
                path="/media",
                enabled=False,
            )
            session.add(connection)
            await session.commit()

            service = PlexService(session)
            connection.server_token = None
            await session.commit()
            with pytest.raises(PlexInputError):
                await service.set_enabled(True)
            await session.refresh(connection)
            assert connection.enabled is False

            connection.server_token = "server"
            connection.enabled = True
            await session.commit()
            auth_state = PlexAuthState(
                attempt=PinAttempt(pin_id=1, code="code", expires_at=10**12)
            )

            async def get_auth_token(_plex, _pin_id, _code):
                return "reauthorized-account"

            monkeypatch.setattr(
                plex_network.PlexClient, "get_auth_token", get_auth_token
            )
            result = await service.poll_auth(auth_state, wake_event=asyncio.Event())
            await session.refresh(connection)
            assert result.status == "completed"
            assert connection.token == "reauthorized-account"
            assert connection.enabled is False
            assert connection.server_token is None
            assert connection.url == ""
            assert connection.section_id is None
            assert connection.path == ""
            assert connection.account_reauth_required is False


@pytest.mark.asyncio
async def test_discovery_rejects_resource_identity_mismatch(tmp_path, monkeypatch):
    async def handler(request):
        if request.url.path.endswith("/resources"):
            return httpx2.Response(
                200,
                json=[
                    {
                        "provides": "server",
                        "clientIdentifier": "pms-1",
                        "name": "PMS",
                        "accessToken": "wrong-server-token",
                        "connections": [],
                    }
                ],
            )
        if request.url.path.endswith("/identity"):
            return httpx2.Response(
                200, content=b'<MediaContainer machineIdentifier="pms-2"/>'
            )
        pytest.fail(f"Unexpected request: {request.url}")

    use_transport(monkeypatch, handler)
    async with database(tmp_path / "discovery.db") as sessions:
        async with sessions() as session:
            session.add(PlexConnection(client_identifier="client", token="account"))
            await session.commit()
            with pytest.raises(PlexDiscoveryError) as error:
                await PlexService(session).libraries_for_connection(
                    "localhost", 32400, False
                )
    assert error.value.code == "server_unrecognized"


@pytest.mark.asyncio
async def test_recovery_keeps_saved_url_and_job_when_identity_differs(
    tmp_path, monkeypatch
):
    async def handler(request):
        if request.url.path.endswith("/resources"):
            return httpx2.Response(
                200,
                json=[
                    {
                        "provides": "server",
                        "clientIdentifier": "pms-1",
                        "name": "PMS",
                        "accessToken": "server-token",
                        "connections": [
                            {
                                "uri": "http://new-host:32400",
                                "local": True,
                                "protocol": "http",
                                "relay": False,
                                "IPv6": False,
                            }
                        ],
                    }
                ],
            )
        if request.url.path.endswith("/identity"):
            return httpx2.Response(
                200, content=b'<MediaContainer machineIdentifier="pms-2"/>'
            )
        if request.url.path.endswith("/refresh"):
            return httpx2.Response(404)
        pytest.fail(f"Unexpected request: {request.url}")

    use_transport(monkeypatch, handler)
    async with database(tmp_path / "recovery.db") as sessions:
        async with sessions() as session:
            session.add(
                PlexConnection(
                    client_identifier="client",
                    token="account-token",
                    server_token="old-token",
                    server_identifier="pms-1",
                    url="http://old-host:32400",
                    section_id=1,
                    path="/media",
                    enabled=True,
                )
            )
            session.add(PlexRefreshJob(path="/media/episode.mkv"))
            await session.commit()

        await PlexRefreshWorker(
            wake_event=asyncio.Event(), sessions=sessions
        ).run_once()

        async with sessions() as session:
            connection = await session.get(PlexConnection, 1)
            job = await session.get(PlexRefreshJob, "/media/episode.mkv")
            assert connection is not None
            assert connection.url == "http://old-host:32400"
            assert connection.server_token == "old-token"
            assert job is not None


@pytest.mark.asyncio
async def test_server_token_401_refreshes_token_and_retries(tmp_path, monkeypatch):
    refresh_requests = []

    async def handler(request):
        if request.url.path.endswith("/refresh"):
            refresh_requests.append(
                (request.url.host, request.headers.get("X-Plex-Token"))
            )
            status = 401 if len(refresh_requests) == 1 else 200
            return httpx2.Response(status)
        if request.url.path.endswith("/resources"):
            return httpx2.Response(
                200,
                json=[
                    {
                        "provides": "server",
                        "clientIdentifier": "pms-1",
                        "name": "PMS",
                        "accessToken": "new-server-token",
                        "connections": [
                            {
                                "uri": "http://new-host:32400",
                                "local": True,
                                "protocol": "http",
                                "relay": False,
                                "IPv6": False,
                            }
                        ],
                    }
                ],
            )
        if request.url.path.endswith("/identity"):
            return httpx2.Response(
                200, content=b'<MediaContainer machineIdentifier="pms-1"/>'
            )
        if request.url.path.endswith("/library/sections"):
            return httpx2.Response(
                200,
                content=(
                    b'<MediaContainer><Directory key="1" title="Shows">'
                    b'<Location path="/media"/></Directory></MediaContainer>'
                ),
            )
        pytest.fail(f"Unexpected request: {request.url}")

    use_transport(monkeypatch, handler)
    async with database(tmp_path / "server-token-recovery.db") as sessions:
        async with sessions() as session:
            session.add(
                PlexConnection(
                    client_identifier="client",
                    token="account-token",
                    server_token="old-server-token",
                    server_identifier="pms-1",
                    url="http://old-host:32400",
                    section_id=1,
                    path="/media",
                    enabled=True,
                )
            )
            session.add(PlexRefreshJob(path="/media/episode.mkv"))
            await session.commit()

        worker = PlexRefreshWorker(wake_event=asyncio.Event(), sessions=sessions)
        assert await worker.run_once() is False

        async with sessions() as session:
            connection = await session.get(PlexConnection, 1)
            job = await session.get(PlexRefreshJob, "/media/episode.mkv")
            assert connection is not None
            assert connection.url == "http://new-host:32400"
            assert connection.server_token == "new-server-token"
            assert connection.account_reauth_required is False
            assert job is None

    assert refresh_requests == [
        ("old-host", "old-server-token"),
        ("new-host", "new-server-token"),
    ]
