import asyncio

from module.conf import settings
from module.downloader import DownloadClient
from module.manager import Renamer, eps_complete
from module.notification import PostNotification
from module.rss import RSSAnalyser, RSSEngine

from .status import ProgramStatus


class RSSThread(ProgramStatus):
    def __init__(self):
        super().__init__()
        self.analyser = RSSAnalyser()

    async def _rss_async_loop(self):
        await self._run_loop(self._rss_loop, settings.program.rss_time, "RSS")

    async def _rss_loop(self):
        async with DownloadClient() as client, RSSEngine() as engine:
            # Run RSS Engine
            await engine.refresh_rss(client)
        if settings.bangumi_manage.eps_complete:
            await eps_complete()


class RenameThread(ProgramStatus):
    async def _rename_async_loop(self):
        await self._run_loop(self._rename_loop, settings.program.rename_time, "Renamer")

    async def _rename_loop(self):
        async with Renamer() as renamer:
            renamed_info = await renamer.rename()
        if settings.notification.enable:
            async with PostNotification() as notifier:
                for info in renamed_info:
                    await notifier.send_msg(info)
                    await asyncio.sleep(2)
