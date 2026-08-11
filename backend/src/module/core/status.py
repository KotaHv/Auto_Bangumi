import asyncio
import threading
import time

from loguru import logger
from qbittorrentapi.exceptions import (
    APIConnectionError,
    Forbidden403Error,
    LoginFailed,
    Unauthorized401Error,
)
from requests.exceptions import ConnectionError

from module.checker import Checker

DOWNLOADER_RETRY_INTERVAL = 30
IP_BAN_RETRY_INTERVAL = 300


class ProgramStatus(Checker):
    def __init__(self):
        super().__init__()
        self.stop_event = threading.Event()
        self.lock = threading.Lock()
        self._downloader_status = False
        self._torrents_status = False
        self.event = asyncio.Event()

    @property
    def is_running(self):
        if self.stop_event.is_set() or self.check_first_run():
            return False
        else:
            return True

    @property
    def is_stopped(self):
        return self.stop_event.is_set()

    def _wait_recovery(
        self,
        interval: int,
        first_message: str,
        debug_message: str,
        waiting: bool,
    ):
        """Log once on first failure, then debug, and wait interruptibly."""
        if not waiting:
            logger.error(first_message)
        else:
            logger.debug(debug_message)
        self.stop_event.wait(interval)

    def _run_loop(self, work, cycle_seconds: int, component: str):
        """Run a worker in a loop, waiting for the downloader when needed."""
        waiting_recovery = False
        while not self.stop_event.is_set():
            try:
                work()
            except LoginFailed, Unauthorized401Error:
                logger.error(
                    f"[{component}] qBittorrent rejected credentials: "
                    "username/password or API key may be incorrect. "
                    "Will retry next cycle."
                )
            except Forbidden403Error:
                self._wait_recovery(
                    interval=IP_BAN_RETRY_INTERVAL,
                    first_message=(
                        f"[{component}] qBittorrent refused access (IP may be banned), "
                        "waiting for the IP to be released..."
                    ),
                    debug_message=f"[{component}] IP still banned, will retry.",
                    waiting=waiting_recovery,
                )
                waiting_recovery = True
                continue
            except APIConnectionError as e:
                if not isinstance(e.__context__, ConnectionError):
                    logger.exception(f"[{component}] error: {e}")
                else:
                    self._wait_recovery(
                        interval=DOWNLOADER_RETRY_INTERVAL,
                        first_message=(
                            f"[{component}] Cannot connect to downloader, "
                            "waiting for recovery..."
                        ),
                        debug_message=(
                            f"[{component}] Downloader still unavailable, will retry."
                        ),
                        waiting=waiting_recovery,
                    )
                    waiting_recovery = True
                    continue
            except Exception as e:
                logger.exception(f"[{component}] error: {e}")
            waiting_recovery = False
            self._wait_cycle(cycle_seconds)

    def _wait_cycle(self, timeout: int):
        """Sleep until the next cycle, or return early when stopped."""
        deadline = time.monotonic() + timeout
        while not self.stop_event.is_set():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return
            time.sleep(min(remaining, 1))

    @property
    def downloader_status(self):
        if not self._downloader_status:
            self._downloader_status = self.check_downloader()
        return self._downloader_status

    @property
    def enable_rss(self):
        return self.check_analyser()

    @property
    def enable_renamer(self):
        return self.check_renamer()

    @property
    def first_run(self):
        return self.check_first_run()

    @property
    def version_update(self):
        return not self.check_version()

    @property
    def database(self):
        return self.check_database()

    @property
    def img_cache(self):
        return self.check_img_cache()

    @property
    def torrent_hash(self):
        return self.check_torrent_hash()
