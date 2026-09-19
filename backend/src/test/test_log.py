import logging

import pytest

import module.conf.log as log_module
from module.conf import settings


def test_log_policy_allows_only_module_debug():
    assert log_module.is_module_logger("module")
    assert log_module.is_module_logger("module.database.rss")
    assert not log_module.is_module_logger("aiosqlite")
    assert not log_module.is_module_logger("hpack.hpack")
    assert not log_module.is_module_logger("httpcore2")

    assert log_module.allows_log("module.rss", logging.DEBUG)
    assert not log_module.allows_log("aiosqlite", logging.DEBUG)
    assert not log_module.allows_log("hpack.hpack", logging.DEBUG)
    assert not log_module.allows_log("httpcore2", logging.DEBUG)
    assert log_module.allows_log("httpcore2", logging.INFO)


@pytest.mark.parametrize(
    ("debug_enable", "expected_module_level"),
    [(False, logging.INFO), (True, logging.DEBUG)],
)
def test_setup_logger_configures_stdlib_hierarchy(
    tmp_path, monkeypatch, debug_enable, expected_module_level
):
    monkeypatch.setattr(log_module, "LOG_PATH", tmp_path / "log.txt")
    monkeypatch.setattr(settings.log, "debug_enable", debug_enable)

    log_module.setup_logger()

    assert logging.getLogger().level == logging.INFO
    assert logging.getLogger("module").getEffectiveLevel() == expected_module_level
    assert (
        logging.getLogger("module.database.rss").getEffectiveLevel()
        == expected_module_level
    )
