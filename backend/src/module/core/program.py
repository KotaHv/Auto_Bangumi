import threading

from loguru import logger

from module.conf import VERSION, settings
from module.models import ResponseModel
from module.update import (
    cache_image,
    first_run,
    start_up,
    torrent_migration,
)

from .sub_thread import RenameThread, RSSThread

figlet = r"""
                _        ____                                    _
     /\        | |      |  _ \                                  (_)
    /  \  _   _| |_ ___ | |_) | __ _ _ __   __ _ _   _ _ __ ___  _
   / /\ \| | | | __/ _ \|  _ < / _` | '_ \ / _` | | | | '_ ` _ \| |
  / ____ \ |_| | || (_) | |_) | (_| | | | | (_| | |_| | | | | | | |
 /_/    \_\__,_|\__\___/|____/ \__,_|_| |_|\__, |\__,_|_| |_| |_|_|
                                            __/ |
                                           |___/
"""

DOWNLOADER_RETRY_INTERVAL = 60


class Program(RenameThread, RSSThread):
    def __init__(self):
        super().__init__()
        self._retry_stop_event = threading.Event()
        self._retry_thread: threading.Thread | None = None

    @staticmethod
    def __start_info():
        for line in figlet.splitlines():
            logger.info(line.strip("\n"))
        logger.info(f"Starting AutoBangumi Version {VERSION}...")

    def startup(self):
        self.__start_info()
        if not self.database:
            first_run()
            logger.info("[Core] No db file exists, create database file.")
            return {"status": "First run detected."}
        if not self.img_cache:
            logger.info("[Core] No image cache exists, create image cache.")
            cache_image()
        if not self.torrent_hash:
            logger.info(
                "[Core] The hash field of the torrent table does not exist or its value is empty, get torrent hash."
            )
            torrent_migration()
        self.start()

    def start(self):
        with self.lock:
            self.stop_event.clear()
            settings.load()
            # Reset cached status so every start attempt performs a fresh check.
            self._downloader_status = False
            if self.downloader_status:
                self._stop_retry()
                if self.enable_renamer:
                    self.rename_start()
                if self.enable_rss:
                    self.rss_start()
                logger.info("Program running.")
                return ResponseModel(
                    status=True,
                    status_code=200,
                    msg_en="Program started.",
                    msg_zh="程序启动成功。",
                )
            else:
                self.stop_event.set()
                if self._retry_thread and self._retry_thread.is_alive():
                    logger.debug("[Core] Downloader is still unavailable, retrying...")
                else:
                    self._start_retry()
                    logger.warning(
                        "Program failed to start, will keep retrying in the "
                        "background until the downloader is ready."
                    )
                return ResponseModel(
                    status=False,
                    status_code=406,
                    msg_en="Program failed to start, will retry automatically.",
                    msg_zh="程序启动失败，将自动重试。",
                )

    def stop(self):
        self._stop_retry()
        if self.is_running:
            self.stop_event.set()
            self.rename_stop()
            self.rss_stop()
            return ResponseModel(
                status=True,
                status_code=200,
                msg_en="Program stopped.",
                msg_zh="程序停止成功。",
            )
        else:
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en="Program is not running.",
                msg_zh="程序未运行。",
            )

    def _start_retry(self):
        self._retry_stop_event.clear()
        if self._retry_thread and self._retry_thread.is_alive():
            return
        self._retry_thread = threading.Thread(
            target=self._retry_loop,
            name="DownloaderRetryThread",
            daemon=True,
        )
        self._retry_thread.start()

    def _retry_loop(self):
        while not self._retry_stop_event.wait(DOWNLOADER_RETRY_INTERVAL):
            self.start()

    def _stop_retry(self):
        self._retry_stop_event.set()

    def restart(self):
        self.stop()
        self.start()
        return ResponseModel(
            status=True,
            status_code=200,
            msg_en="Program restarted.",
            msg_zh="程序重启成功。",
        )

    def update_database(self):
        if not self.version_update:
            return {"status": "No update found."}
        else:
            start_up()
            return {"status": "Database updated."}
