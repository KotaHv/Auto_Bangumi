from unittest.mock import MagicMock

import pytest
from qbittorrentapi.exceptions import APIConnectionError, Forbidden403Error, LoginFailed
from requests.exceptions import ConnectionError

import module.checker.checker as checker_module
import module.core.sub_thread as sub_thread_module
from module.checker import Checker
from module.core.sub_thread import RSSThread
from module.downloader import DownloadClient
from module.downloader.client.qb_downloader import QbDownloader


def connection_error():
    try:
        raise ConnectionError("down")
    except ConnectionError:
        raise APIConnectionError("cannot connect") from None


def test_auth_success_returns_true():
    qb = object.__new__(QbDownloader)
    qb._client = MagicMock()
    assert qb.auth() is True
    qb._client.auth_log_in.assert_called_once()


@pytest.mark.parametrize("error", [LoginFailed, Forbidden403Error])
def test_auth_raises_typed_errors(error):
    qb = object.__new__(QbDownloader)
    qb._client = MagicMock()
    qb._client.auth_log_in.side_effect = error()
    with pytest.raises(error):
        qb.auth()


def test_auth_raises_connection_error():
    qb = object.__new__(QbDownloader)
    qb._client = MagicMock()
    qb._client.auth_log_in.side_effect = connection_error
    with pytest.raises(APIConnectionError) as exc_info:
        qb.auth()
    assert isinstance(exc_info.value.__context__, ConnectionError)


def test_download_client_enter_propagates_auth_failure():
    client = DownloadClient()
    client.client._client = MagicMock()
    client.client._client.auth_log_in.side_effect = LoginFailed()
    with pytest.raises(LoginFailed):
        with client:
            pass


def test_check_downloader_uses_download_client(monkeypatch):
    mock_client = MagicMock()
    monkeypatch.setattr(checker_module, "DownloadClient", lambda: mock_client)
    mock_client.__enter__.return_value.authed = True
    assert Checker.check_downloader() is True
    mock_client.__enter__.return_value.authed = False
    assert Checker.check_downloader() is False
    mock_client.__enter__.side_effect = LoginFailed()
    assert Checker.check_downloader() is False


def test_rss_loop_fails_before_rss_engine(monkeypatch):
    mock_download_client = MagicMock()
    mock_download_client.__enter__.side_effect = LoginFailed()
    monkeypatch.setattr(
        sub_thread_module, "DownloadClient", lambda: mock_download_client
    )
    mock_engine = MagicMock()
    monkeypatch.setattr(sub_thread_module, "RSSEngine", mock_engine)
    rss_thread = RSSThread()
    with pytest.raises(LoginFailed):
        rss_thread._rss_loop()
    mock_engine.assert_not_called()
