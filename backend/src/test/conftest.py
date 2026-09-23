import asyncio
import os
import tempfile
from collections.abc import Iterator
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

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
