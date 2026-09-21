import asyncio
from collections.abc import Iterator
from pathlib import Path

import pytest

from module.database.log import LogDatabase
from module.logger import LoggerManager


@pytest.fixture
def isolated_log_manager(tmp_path: Path) -> Iterator[LoggerManager]:
    manager = LoggerManager(
        database=LogDatabase(path=tmp_path / "logs.db"),
        log_path=tmp_path / "data" / "log.txt",
    )
    try:
        yield manager
    finally:
        asyncio.run(manager.shutdown())
