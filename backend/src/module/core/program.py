import asyncio

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
        logger.info("Starting AutoBangumi Version {}...", VERSION)

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
        await self.start()

    async def start(self):
        async with self._lock:
            if self._running:
                logger.warning("Program is already running.")
                return ResponseModel(
                    status=False,
                    status_code=406,
                    msg_en="Program is already running.",
                    msg_zh="程序已在运行。",
                )
            await asyncio.to_thread(settings.load)
            # Reset cached status so every start attempt performs a fresh check.
            self._running = True
            online = await self.check_downloader()
            workers = []
            if self.enable_renamer:
                workers.append(self._rename_async_loop)
            if self.enable_rss:
                workers.append(self._rss_async_loop)
            if workers:
                self._workers.start(workers)
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

    async def stop(self):
        async with self._lock:
            running = self.is_running
            self._running = False
            await self._workers.stop()
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

    async def restart(self):
        await self.stop()
        await self.start()
        return ResponseModel(
            status=True,
            status_code=200,
            msg_en="Program restarted.",
            msg_zh="程序重启成功。",
        )
