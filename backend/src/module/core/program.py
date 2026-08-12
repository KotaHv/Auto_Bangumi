from loguru import logger

from module.conf import VERSION, settings
from module.models import ResponseModel
from module.update import (
    cache_image,
    first_run,
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


class Program(RenameThread, RSSThread):
    @staticmethod
    def __start_info():
        for line in figlet.splitlines():
            logger.info(line.strip("\n"))
        logger.info(f"Starting AutoBangumi Version {VERSION}...")

    async def startup(self):
        self.__start_info()
        if not self.database:
            await first_run()
            logger.info("[Core] No db file exists, create database file.")
            return {"status": "First run detected."}
        if not self.img_cache:
            logger.info("[Core] No image cache exists, create image cache.")
            await cache_image()
        if not await self.check_torrent_hash():
            logger.info(
                "[Core] The hash field of the torrent table does not exist or its value is empty, get torrent hash."
            )
            await torrent_migration()
        self.start()

    def start(self):
        with self.lock:
            self.stop_event.clear()
            settings.load()
            # Reset cached status so every start attempt performs a fresh check.
            self._downloader_status = False
            online = self.downloader_status
            if self.enable_renamer:
                self.rename_start()
            if self.enable_rss:
                self.rss_start()
            if online:
                logger.info("Program running.")
                return ResponseModel(
                    status=True,
                    status_code=200,
                    msg_en="Program started.",
                    msg_zh="程序启动成功。",
                )
            else:
                logger.warning(
                    "Downloader is unavailable, tasks will wait for recovery."
                )
                return ResponseModel(
                    status=False,
                    status_code=406,
                    msg_en=(
                        "Program failed to start, will start automatically "
                        "when the downloader is ready."
                    ),
                    msg_zh="程序启动失败，下载器恢复后自动启动。",
                )

    def stop(self):
        running = self.is_running
        self.stop_event.set()
        self.rename_stop()
        self.rss_stop()
        if running:
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

    def restart(self):
        self.stop()
        self.start()
        return ResponseModel(
            status=True,
            status_code=200,
            msg_en="Program restarted.",
            msg_zh="程序重启成功。",
        )
