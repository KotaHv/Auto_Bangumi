import asyncio
import calendar
import json
import threading
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import cast

import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient
from starlette.types import Message, Scope

from module.api import log as log_api
from module.database.log import MAX_LIMIT, LogDatabase
from module.logger import LoggerManager
from module.models.log import LogEntry, TailFilters

BASE = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)


def microseconds(value: datetime) -> int:
    utc = value.astimezone(UTC)
    return calendar.timegm(utc.utctimetuple()) * 1_000_000 + utc.microsecond


def build_app(tmp_path: Path) -> tuple[FastAPI, LogDatabase, LoggerManager, Path]:
    database = LogDatabase(path=tmp_path / "logs.db")
    text_log = tmp_path / "log.txt"
    manager = LoggerManager(database=database)

    app = FastAPI()
    app.state.log_manager = manager
    app.include_router(log_api.router, prefix="/api/v1")
    app.dependency_overrides[log_api.require_session] = lambda: None

    # Mirrors main.create_app: a dict detail is returned as the bilingual body.
    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException):
        if isinstance(exc.detail, dict):
            content = exc.detail
        else:
            content = {"msg_en": str(exc.detail), "msg_zh": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content=content)

    return app, database, manager, text_log


async def require_test_session(request: Request) -> None:
    if request.cookies.get("session") != "test-session":
        raise HTTPException(status_code=401, detail="Unauthorized")


class ASGIEventStream:
    def __init__(
        self,
        app: FastAPI,
        *,
        cookie: str | None = None,
        query_string: bytes = b"",
    ):
        self.incoming: asyncio.Queue[Message] = asyncio.Queue()
        self.outgoing: asyncio.Queue[Message] = asyncio.Queue()
        self.incoming.put_nowait(
            {"type": "http.request", "body": b"", "more_body": False}
        )
        headers = [(b"host", b"testserver"), (b"accept", b"text/event-stream")]
        if cookie is not None:
            headers.append((b"cookie", f"session={cookie}".encode()))
        scope: Scope = {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.4"},
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": "/api/v1/log/tail",
            "raw_path": b"/api/v1/log/tail",
            "query_string": query_string,
            "root_path": "",
            "headers": headers,
            "client": ("testclient", 123),
            "server": ("testserver", 80),
        }
        self.app = app
        self.scope = scope
        self.task: asyncio.Task | None = None
        self.status_code: int | None = None

    async def _receive(self) -> Message:
        return await self.incoming.get()

    async def _send(self, message: Message) -> None:
        await self.outgoing.put(message)

    async def start(self) -> int:
        self.task = asyncio.create_task(self.app(self.scope, self._receive, self._send))
        message = await asyncio.wait_for(self.outgoing.get(), timeout=2)
        if message["type"] != "http.response.start":
            raise AssertionError(f"Expected response start, got {message['type']}")
        status_code = message.get("status")
        if not isinstance(status_code, int):
            raise AssertionError(f"Invalid response status: {status_code!r}")
        self.status_code = status_code
        return status_code

    async def read_sse_frame(self) -> bytes:
        frame = bytearray()
        while b"\n\n" not in frame and b"\r\n\r\n" not in frame:
            message = await asyncio.wait_for(self.outgoing.get(), timeout=2)
            if message["type"] == "http.response.body":
                frame.extend(message.get("body", b""))
        return bytes(frame)

    async def disconnect(self) -> None:
        self.incoming.put_nowait({"type": "http.disconnect"})
        assert self.task is not None
        await asyncio.wait_for(self.task, timeout=2)


def parse_sse_frame(frame: bytes) -> tuple[str, str]:
    event = "message"
    data: list[str] = []
    for line in frame.decode().splitlines():
        if line.startswith("event: "):
            event = line.removeprefix("event: ")
        elif line.startswith("data: "):
            data.append(line.removeprefix("data: "))
    return event, "\n".join(data)


def add_entry(
    database: LogDatabase,
    *,
    level_no: int,
    message: str,
    module: str = "module.test",
    offset: int = 0,
    exception: str | None = None,
) -> None:
    database.add(
        LogEntry(
            timestamp=microseconds(BASE) + offset,
            level_no=level_no,
            message=message,
            module=module,
            function="function",
            line=1,
            exception=exception,
        )
    )


def request[T](
    tmp_path: Path,
    run: Callable[[AsyncClient, LogDatabase], Awaitable[T]],
    prepare: Callable[[LogDatabase, Path], None] | None = None,
) -> Awaitable[T]:
    async def execute() -> T:
        app, database, manager, text_log = build_app(tmp_path)
        if prepare is not None:
            prepare(database, text_log)
        try:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://testserver"
            ) as client:
                return await run(client, database)
        finally:
            await manager.shutdown()

    return execute()


@pytest.mark.asyncio
async def test_get_log_returns_typed_page(tmp_path: Path):
    def prepare(database: LogDatabase, _text_log: Path) -> None:
        add_entry(database, level_no=10, message="debug line", module="module.debug")
        add_entry(database, level_no=30, message="warning line", module="module.db.rss")
        add_entry(database, level_no=40, message="error line", module="module.db.rss")

    async def run(client: AsyncClient, _database: LogDatabase):
        return await client.get("/api/v1/log")

    response = await request(tmp_path, run, prepare)

    assert response.status_code == 200
    body = response.json()
    assert [item["level"] for item in body["items"]] == [
        "ERROR",
        "WARNING",
        "DEBUG",
    ]
    assert body["has_more"] is False
    assert body["next_cursor"] is None
    assert set(body["items"][0]) == {
        "id",
        "timestamp",
        "level",
        "message",
        "module",
        "function",
        "line",
        "exception",
    }
    assert body["items"][0]["timestamp"].endswith("+00:00")


@pytest.mark.asyncio
async def test_get_log_level_filter_is_exact(tmp_path: Path):
    def prepare(database: LogDatabase, _text_log: Path) -> None:
        add_entry(database, level_no=30, message="warning line")
        add_entry(database, level_no=40, message="error line")
        add_entry(database, level_no=50, message="critical line")

    async def run(client: AsyncClient, _database: LogDatabase):
        return await client.get("/api/v1/log", params={"level": "WARNING"})

    response = await request(tmp_path, run, prepare)

    assert [item["level"] for item in response.json()["items"]] == ["WARNING"]


@pytest.mark.asyncio
async def test_get_log_paginates_with_cursor(tmp_path: Path):
    def prepare(database: LogDatabase, _text_log: Path) -> None:
        for index in range(5):
            add_entry(database, level_no=20, message=f"line {index}", offset=index)

    async def run(client: AsyncClient, _database: LogDatabase):
        first = (await client.get("/api/v1/log", params={"limit": 2})).json()
        second = (
            await client.get(
                "/api/v1/log",
                params={"limit": 2, "before_id": first["next_cursor"]},
            )
        ).json()
        return first, second

    first, second = await request(tmp_path, run, prepare)

    assert first["has_more"] is True
    assert first["next_cursor"] == first["items"][-1]["id"]
    assert [item["message"] for item in first["items"]] == ["line 4", "line 3"]
    assert [item["message"] for item in second["items"]] == ["line 2", "line 1"]

    first_ids = {item["id"] for item in first["items"]}
    second_ids = {item["id"] for item in second["items"]}
    assert first_ids.isdisjoint(second_ids)


@pytest.mark.asyncio
async def test_get_log_module_and_query_filters(tmp_path: Path):
    def prepare(database: LogDatabase, _text_log: Path) -> None:
        add_entry(database, level_no=20, message="alpha line", module="module.alpha")
        add_entry(database, level_no=20, message="beta line", module="module.beta")

    async def run(client: AsyncClient, _database: LogDatabase):
        by_module = (await client.get("/api/v1/log", params={"module": "alpha"})).json()
        by_query = (await client.get("/api/v1/log", params={"query": "beta"})).json()
        return by_module, by_query

    by_module, by_query = await request(tmp_path, run, prepare)

    assert [item["message"] for item in by_module["items"]] == ["alpha line"]
    assert [item["message"] for item in by_query["items"]] == ["beta line"]


@pytest.mark.asyncio
async def test_get_log_filters_by_time_range(tmp_path: Path):
    def prepare(database: LogDatabase, _text_log: Path) -> None:
        add_entry(database, level_no=20, message="at base", offset=0)
        add_entry(database, level_no=20, message="one hour later", offset=3_600_000_000)

    async def run(client: AsyncClient, _database: LogDatabase):
        return await client.get(
            "/api/v1/log",
            params={"start": (BASE.replace(minute=30)).isoformat()},
        )

    response = await request(tmp_path, run, prepare)

    assert response.status_code == 200
    assert [item["message"] for item in response.json()["items"]] == ["one hour later"]


@pytest.mark.asyncio
async def test_get_log_returns_exception_traceback(tmp_path: Path):
    def prepare(database: LogDatabase, _text_log: Path) -> None:
        add_entry(
            database,
            level_no=40,
            message="boom",
            exception="Traceback (most recent call last):\nZeroDivisionError: x",
        )

    async def run(client: AsyncClient, _database: LogDatabase):
        return (await client.get("/api/v1/log")).json()

    body = await request(tmp_path, run, prepare)

    assert "ZeroDivisionError" in body["items"][0]["exception"]


@pytest.mark.asyncio
async def test_get_tail_rejects_invalid_filters_before_streaming(tmp_path: Path):
    async def run(client: AsyncClient, _database: LogDatabase):
        return await client.get(
            "/api/v1/log/tail",
            params={"start": "2026-01-01T12:00:00+00:00", "end": "2026-01-01T13:00:00"},
        )

    response = await request(tmp_path, run)

    assert response.status_code == 400
    body = response.json()
    assert "timezone-aware" in body["msg_en"]
    assert body["msg_zh"]


@pytest.mark.asyncio
async def test_tail_stream_catches_up_batches_and_advances_actual_last_id(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(log_api, "TAIL_POLL_INTERVAL_SECONDS", 0)

    async def run(_client: AsyncClient, database: LogDatabase):
        for index in range(MAX_LIMIT + 3):
            add_entry(database, level_no=20, message=f"line {index}")

        original_query = database.query_logs_after
        cursors: list[int] = []

        def query_after(**kwargs):
            cursors.append(kwargs["last_id"])
            if len(cursors) == 3:
                add_entry(database, level_no=20, message="arrived after catch-up")
            return original_query(**kwargs)

        database.query_logs_after = query_after

        class DisconnectAfterThreeChecks:
            checks = 0

            async def is_disconnected(self) -> bool:
                self.checks += 1
                return self.checks > 2

        stream = log_api._tail_event_stream(
            cast(Request, DisconnectAfterThreeChecks()),
            database,
            [],
            TailFilters(),
        )
        initial = await anext(stream)
        received_ids = []
        while True:
            try:
                event = await anext(stream)
            except StopAsyncIteration:
                break
            received_ids.append(json.loads(event["data"])["id"])
        return initial, received_ids, cursors

    initial, received_ids, cursors = await request(tmp_path, run)

    assert initial["event"] == "initial"
    assert json.loads(initial["data"]) == []
    assert received_ids == list(range(1, MAX_LIMIT + 5))
    assert cursors == [0, MAX_LIMIT, MAX_LIMIT + 3]


@pytest.mark.asyncio
async def test_tail_route_streams_initial_sse_after_session_auth(tmp_path: Path):
    app, database, manager, _text_log = build_app(tmp_path)
    app.dependency_overrides[log_api.require_session] = require_test_session
    add_entry(database, level_no=40, message="first error")
    add_entry(database, level_no=20, message="info line")
    add_entry(database, level_no=40, message="second error")

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://testserver"
        ) as client:
            unauthorized = await client.get("/api/v1/log/tail")
            assert unauthorized.status_code == 401

        connection = ASGIEventStream(
            app, cookie="test-session", query_string=b"level=ERROR"
        )
        assert await connection.start() == 200
        frame = await connection.read_sse_frame()
        event_name, data = parse_sse_frame(frame)
        await connection.disconnect()
    finally:
        await manager.shutdown()

    records = json.loads(data)
    assert event_name == "initial"
    assert [record["message"] for record in records] == [
        "first error",
        "second error",
    ]
    assert records[0]["id"] < records[1]["id"]


@pytest.mark.asyncio
async def test_tail_route_stops_polling_after_client_disconnect(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(log_api, "TAIL_POLL_INTERVAL_SECONDS", 0.01)
    app, database, manager, _text_log = build_app(tmp_path)
    app.dependency_overrides[log_api.require_session] = require_test_session
    add_entry(database, level_no=20, message="initial")

    query_started = threading.Event()
    calls_lock = threading.Lock()
    query_calls = 0
    original_query = database.query_logs_after

    def track_query(**kwargs):
        nonlocal query_calls
        with calls_lock:
            query_calls += 1
        query_started.set()
        return original_query(**kwargs)

    database.query_logs_after = track_query

    try:
        connection = ASGIEventStream(app, cookie="test-session")
        assert await connection.start() == 200
        frame = await connection.read_sse_frame()
        event_name, data = parse_sse_frame(frame)
        assert event_name == "initial"
        assert json.loads(data)[0]["message"] == "initial"
        assert await asyncio.to_thread(query_started.wait, 2)

        await connection.disconnect()
        with calls_lock:
            calls_after_disconnect = query_calls
        await asyncio.sleep(0.05)
        with calls_lock:
            assert query_calls == calls_after_disconnect
    finally:
        await manager.shutdown()


@pytest.mark.asyncio
async def test_get_log_rejects_naive_datetime(tmp_path: Path):

    async def run(client: AsyncClient, _database: LogDatabase):
        return await client.get("/api/v1/log", params={"start": "2026-01-01T12:00:00"})

    response = await request(tmp_path, run)

    assert response.status_code == 400
    body = response.json()
    assert "timezone-aware" in body["msg_en"]
    assert body["msg_zh"]


@pytest.mark.parametrize(
    ("start", "end"),
    [
        ("2026-01-01T12:00:00+00:00", "2026-01-01T13:00:00"),
        ("2026-01-01T12:00:00", "2026-01-01T13:00:00+00:00"),
    ],
)
@pytest.mark.asyncio
async def test_get_log_rejects_mixed_timezone_range(
    tmp_path: Path, start: str, end: str
):
    async def run(client: AsyncClient, _database: LogDatabase):
        return await client.get("/api/v1/log", params={"start": start, "end": end})

    response = await request(tmp_path, run)

    assert response.status_code == 400
    body = response.json()
    assert "timezone-aware" in body["msg_en"]
    assert body["msg_zh"]


@pytest.mark.asyncio
async def test_get_log_rejects_unknown_level(tmp_path: Path):
    async def run(client: AsyncClient, _database: LogDatabase):
        return await client.get("/api/v1/log", params={"level": "NOPE"})

    response = await request(tmp_path, run)

    assert response.status_code == 400
    assert "Unknown log level" in response.json()["msg_en"]


@pytest.mark.asyncio
async def test_get_log_rejects_out_of_range_limit(tmp_path: Path):
    async def run(client: AsyncClient, _database: LogDatabase):
        return await client.get("/api/v1/log", params={"limit": 501})

    response = await request(tmp_path, run)

    # The bound lives in query_logs, so this is the same bilingual 400 as any
    # other rejected parameter rather than FastAPI's bare 422.
    assert response.status_code == 400
    body = response.json()
    assert "limit must be between 1 and" in body["msg_en"]
    assert body["msg_zh"]


@pytest.mark.asyncio
async def test_get_log_returns_empty_page(tmp_path: Path):
    async def run(client: AsyncClient, _database: LogDatabase):
        return (await client.get("/api/v1/log")).json()

    body = await request(tmp_path, run)

    assert body == {"items": [], "next_cursor": None, "has_more": False}


@pytest.mark.asyncio
async def test_delete_log_returns_deleted_count(tmp_path: Path):
    def prepare(database: LogDatabase, _text_log: Path) -> None:
        add_entry(database, level_no=20, message="one")
        add_entry(database, level_no=20, message="two")

    async def run(client: AsyncClient, _database: LogDatabase):
        deleted = await client.delete("/api/v1/log")
        remaining = await client.get("/api/v1/log")
        return deleted, remaining.json()

    deleted, remaining = await request(tmp_path, run, prepare)

    assert deleted.status_code == 200
    assert deleted.json() == {"deleted_count": 2}
    assert remaining["items"] == []


@pytest.mark.asyncio
async def test_delete_log_keeps_text_log_file(tmp_path: Path):
    def prepare(database: LogDatabase, text_log: Path) -> None:
        add_entry(database, level_no=20, message="one")
        text_log.write_text("legacy content\n")

    async def run(client: AsyncClient, _database: LogDatabase):
        return await client.delete("/api/v1/log")

    await request(tmp_path, run, prepare)

    assert (tmp_path / "log.txt").read_text() == "legacy content\n"


def test_log_routes_are_session_protected():
    dependency_calls = [
        dependency.dependency for dependency in log_api.router.dependencies
    ]
    assert log_api.require_session in dependency_calls
