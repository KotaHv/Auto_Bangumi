import asyncio

from module.conf import settings
from module.database import Database
from module.downloader import DownloadClient
from module.notification import PostNotification
from module.rss import RSSAnalyser
from module.service.rename import RenameService
from module.service.rss import RssService
from module.service.season import SeasonService

from .status import ProgramStatus


class RSSThread(ProgramStatus):
    def __init__(self):
        super().__init__()
        self.analyser = RSSAnalyser()

    async def _rss_async_loop(self):
        await self._run_loop(self._rss_loop, settings.program.rss_time, "RSS")

    async def _rss_loop(self):
        async with Database() as session:
            await RssService(session).refresh_rss()
        if settings.bangumi_manage.eps_complete:
            async with Database() as session:
                await SeasonService(session).collect_incomplete()


class RenameThread(ProgramStatus):
    async def _rename_async_loop(self):
        await self._run_loop(self._rename_loop, settings.program.rename_time, "Renamer")

    async def _rename_loop(self):
        async with Database() as session, DownloadClient() as client:
            renamed_info = await RenameService(session, client).rename()
        if settings.notification.enable:
            async with PostNotification() as notifier:
                for info in renamed_info:
                    await notifier.send_msg(info)
                    await asyncio.sleep(2)
