import asyncio
import os
import tempfile
from collections.abc import AsyncIterator, Iterator
from pathlib import Path
from typing import TYPE_CHECKING

import httpx2
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.pool import StaticPool

if TYPE_CHECKING:
    from module.logger import LoggerManager

_ORIGINAL_CWD = Path.cwd()
_TEST_RUNTIME_DIR: tempfile.TemporaryDirectory[str] | None = None


def pytest_configure(config: pytest.Config) -> None:  # noqa: ARG001
    global _TEST_RUNTIME_DIR
    _TEST_RUNTIME_DIR = tempfile.TemporaryDirectory(prefix="autobangumi-pytest-")
    os.chdir(_TEST_RUNTIME_DIR.name)
    Path("config").mkdir()
    Path("data").mkdir()


def pytest_unconfigure(config: pytest.Config) -> None:  # noqa: ARG001
    if _TEST_RUNTIME_DIR is not None:
        os.chdir(_ORIGINAL_CWD)
        _TEST_RUNTIME_DIR.cleanup()


@pytest.fixture
def isolated_log_manager(tmp_path: Path) -> Iterator[LoggerManager]:
    from module.database.log import LogDatabase
    from module.logger import LoggerManager

    manager = LoggerManager(database=LogDatabase(path=tmp_path / "logs.db"))
    try:
        yield manager
    finally:
        asyncio.run(manager.shutdown())


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


def serve_feeds(
    monkeypatch: pytest.MonkeyPatch,
    feeds: dict[str, list[tuple[str, str]]],
) -> list[str]:
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
