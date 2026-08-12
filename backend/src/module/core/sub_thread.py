import asyncio
import threading

from module.conf import settings
from module.downloader import DownloadClient
from module.manager import Renamer, eps_complete
from module.notification import PostNotification
from module.rss import RSSAnalyser, RSSEngine

from .status import ProgramStatus


class RSSThread(ProgramStatus):
    def __init__(self):
        super().__init__()
        self._rss_thread = threading.Thread(
            target=self.rss_loop,
        )
        self.analyser = RSSAnalyser()

    def rss_loop(self):
        asyncio.run(self._async_rss_loop())

    async def _async_rss_loop(self):
        await self._run_loop(self._rss_loop, settings.program.rss_time, "RSS")

    async def _rss_loop(self):
        async with DownloadClient() as client, RSSEngine() as engine:
            # Run RSS Engine
            await engine.refresh_rss(client)
        if settings.bangumi_manage.eps_complete:
            await eps_complete()

    def rss_start(self):
        if not self._rss_thread.is_alive():
            self.rss_thread.start()

    def rss_stop(self):
        if self._rss_thread.is_alive():
            self._rss_thread.join()

    @property
    def rss_thread(self):
        if not self._rss_thread.is_alive():
            self._rss_thread = threading.Thread(
                target=self.rss_loop,
            )
        return self._rss_thread


class RenameThread(ProgramStatus):
    def __init__(self):
        super().__init__()
        self._rename_thread = threading.Thread(
            target=self.rename_loop,
        )

    def rename_loop(self):
        asyncio.run(self._async_rename_loop())

    async def _async_rename_loop(self):
        await self._run_loop(self._rename_loop, settings.program.rename_time, "Renamer")

    async def _rename_loop(self):
        async with Renamer() as renamer:
            renamed_info = await renamer.rename()
        if settings.notification.enable:
            async with PostNotification() as notifier:
                for info in renamed_info:
                    await notifier.send_msg(info)
                    await asyncio.sleep(2)

    def rename_start(self):
        if not self._rename_thread.is_alive():
            self.rename_thread.start()

    def rename_stop(self):
        if self._rename_thread.is_alive():
            self._rename_thread.join()

    @property
    def rename_thread(self):
        if not self._rename_thread.is_alive():
            self._rename_thread = threading.Thread(
                target=self.rename_loop,
            )
        return self._rename_thread
