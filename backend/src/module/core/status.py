import asyncio

from loguru import logger
from qbittorrentapi.exceptions import (
    APIConnectionError,
    Forbidden403Error,
    LoginFailed,
    Unauthorized401Error,
)
from requests.exceptions import ConnectionError

from module.checker import Checker

from .worker import WorkerGroup

DOWNLOADER_RETRY_INTERVAL = 30
IP_BAN_RETRY_INTERVAL = 300


class ProgramStatus(Checker):
    def __init__(self):
        super().__init__()
        self._torrents_status = False
        self._running = False
        self._workers = WorkerGroup()
        self._lock = asyncio.Lock()

    @property
    def is_running(self):
        if self._running and not self.check_first_run():
            return True
        return False

    async def _wait_recovery(
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
        await asyncio.sleep(interval)

    async def _run_loop(self, work, cycle_seconds: int, component: str):
        """Run a worker in a loop, waiting for the downloader when needed."""
        waiting_recovery = False
        while True:
            try:
                await work()
            except LoginFailed, Unauthorized401Error:
                logger.error(
                    "[{}] qBittorrent rejected credentials: username/password or API key may be incorrect. Will retry next cycle.",
                    component,
                )
            except Forbidden403Error:
                await self._wait_recovery(
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
                    logger.exception("[{}] error: {}", component, e)
                else:
                    await self._wait_recovery(
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
                logger.exception("[{}] error: {}", component, e)
            waiting_recovery = False
            await asyncio.sleep(cycle_seconds)

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
    def database(self):
        return self.check_database()

    @property
    def img_cache(self):
        return self.check_img_cache()
