import logging
from pathlib import Path

import pytest
from loguru import logger

from module.logger import LoggerManager, allows_log, is_module_logger


def test_log_policy_allows_only_module_debug():
    assert is_module_logger("module")
    assert is_module_logger("module.database.rss")
    assert not is_module_logger("aiosqlite")
    assert not is_module_logger("hpack.hpack")
    assert not is_module_logger("httpcore2")

    assert allows_log("module.rss", logging.DEBUG)
    assert not allows_log("aiosqlite", logging.DEBUG)
    assert not allows_log("hpack.hpack", logging.DEBUG)
    assert not allows_log("httpcore2", logging.DEBUG)
    assert allows_log("httpcore2", logging.INFO)


@pytest.mark.parametrize(
    ("debug_enable", "expected_module_level"),
    [(False, logging.INFO), (True, logging.DEBUG)],
)
def test_setup_configures_stdlib_hierarchy(
    isolated_log_manager: LoggerManager,
    debug_enable: bool,
    expected_module_level: int,
):
    isolated_log_manager.setup(debug_enabled=debug_enable)

    assert logging.getLogger().level == logging.INFO
    assert logging.getLogger("module").getEffectiveLevel() == expected_module_level
    assert (
        logging.getLogger("module.database.rss").getEffectiveLevel()
        == expected_module_level
    )


def test_setup_writes_text_log_to_the_manager_path(
    isolated_log_manager: LoggerManager, tmp_path: Path
):
    isolated_log_manager.setup(debug_enabled=False)
    logger.info("isolated text log marker")

    assert "isolated text log marker" in (tmp_path / "data" / "log.txt").read_text()
