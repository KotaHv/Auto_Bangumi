import time

import pytest
from loguru import logger
from qbittorrentapi.exceptions import APIConnectionError, Forbidden403Error, LoginFailed
from requests.exceptions import ConnectionError

import module.conf.config as conf_module
import module.core.status as status_module
from module.checker import Checker
from module.conf import settings
from module.core import Program
from module.core.sub_thread import RenameThread, RSSThread


def wait_until(condition, timeout=5):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if condition():
            return True
        time.sleep(0.02)
    return False


def connection_error():
    try:
        raise ConnectionError("down")
    except ConnectionError:
        raise APIConnectionError("cannot connect") from None


async def _noop(_):
    return None


@pytest.fixture
def log_sink():
    records = []
    sink_id = logger.add(
        lambda message: records.append(message),
        level="DEBUG",
        format="{level}|{message}",
    )
    yield records
    logger.remove(sink_id)


@pytest.fixture
def make_program(monkeypatch):
    programs = []
    monkeypatch.setattr(status_module, "DOWNLOADER_RETRY_INTERVAL", 0.1)
    monkeypatch.setattr(status_module, "IP_BAN_RETRY_INTERVAL", 0.1)
    monkeypatch.setattr(conf_module.Settings, "load", lambda self: None)
    monkeypatch.setattr(settings.program, "rss_time", 1)
    monkeypatch.setattr(settings.program, "rename_time", 1)

    def _make(downloader_online=True, rss_work=None, rename_work=None):
        monkeypatch.setattr(
            Checker, "check_downloader", staticmethod(lambda: downloader_online)
        )
        monkeypatch.setattr(RSSThread, "_rss_loop", rss_work or _noop)
        monkeypatch.setattr(RenameThread, "_rename_loop", rename_work or _noop)
        program = Program()
        programs.append(program)
        return program

    yield _make
    for program in programs:
        program.stop()


def test_start_online_starts_threads(make_program):
    program = make_program()
    assert program.start().status is True
    assert program._rss_thread.is_alive()
    assert program._rename_thread.is_alive()
    program.stop()
    assert not program._rss_thread.is_alive()
    assert not program._rename_thread.is_alive()


def test_start_offline_returns_406_fast_and_threads_wait(make_program):
    program = make_program(downloader_online=False)
    start_time = time.monotonic()
    response = program.start()
    assert response.status is False
    assert response.status_code == 406
    assert time.monotonic() - start_time < 3
    assert program._rss_thread.is_alive()
    assert program._rename_thread.is_alive()
    program.stop()


def test_connection_error_waits_and_retries(make_program, log_sink):
    calls = {"n": 0}

    async def conn_down(_):
        calls["n"] += 1
        raise connection_error()

    program = make_program(rss_work=conn_down)
    assert program.start().status is True
    assert wait_until(lambda: calls["n"] >= 3)
    errors = [
        message
        for message in log_sink
        if "Cannot connect to downloader" in message and message.startswith("ERROR|")
    ]
    debugs = [
        message
        for message in log_sink
        if "still unavailable" in message and message.startswith("DEBUG|")
    ]
    assert len(errors) == 1
    assert len(debugs) >= 1
    program.stop()


def test_credentials_error_uses_cycle_not_recovery_interval(make_program, log_sink):
    calls = {"n": 0}

    async def bad_credentials(_):
        calls["n"] += 1
        raise LoginFailed()

    program = make_program(rss_work=bad_credentials)
    assert program.start().status is True
    time.sleep(0.4)  # longer than the 0.1s recovery interval
    assert calls["n"] == 1  # no fast recovery retry
    assert wait_until(lambda: calls["n"] >= 2, timeout=4)  # retried on next cycle
    assert any("rejected credentials" in message for message in log_sink)
    program.stop()


def test_forbidden_error_waits_until_ip_released(make_program, log_sink):
    calls = {"n": 0}

    async def banned(_):
        calls["n"] += 1
        raise Forbidden403Error()

    program = make_program(rss_work=banned)
    assert program.start().status is True
    assert wait_until(lambda: calls["n"] >= 3)
    errors = [
        message
        for message in log_sink
        if "IP may be banned" in message and message.startswith("ERROR|")
    ]
    assert len(errors) == 1
    program.stop()


def test_non_connection_api_error_is_not_recovery(make_program, log_sink):
    calls = {"n": 0}

    async def bad_host(_):
        calls["n"] += 1
        raise APIConnectionError("bad host")

    program = make_program(rss_work=bad_host)
    assert program.start().status is True
    time.sleep(0.4)
    assert calls["n"] == 1  # not fast-retried as a connection failure
    assert not any("Cannot connect to downloader" in message for message in log_sink)
    program.stop()


def test_stop_during_connection_wait_exits_promptly(make_program):
    calls = {"n": 0}

    async def conn_down(_):
        calls["n"] += 1
        raise connection_error()

    program = make_program(rss_work=conn_down)
    assert program.start().status is True
    assert wait_until(lambda: calls["n"] >= 2)
    start_time = time.monotonic()
    program.stop()
    assert time.monotonic() - start_time < 3
    assert not program._rss_thread.is_alive()
    assert not program._rename_thread.is_alive()


def test_rename_loop_shares_recovery_logic(make_program, log_sink):
    calls = {"n": 0}

    async def bad_credentials(_):
        calls["n"] += 1
        raise LoginFailed()

    program = make_program(rename_work=bad_credentials)
    assert program.start().status is True
    time.sleep(0.4)
    assert calls["n"] == 1
    assert any(
        "rejected credentials" in message and "[Renamer]" in message
        for message in log_sink
    )
    program.stop()
