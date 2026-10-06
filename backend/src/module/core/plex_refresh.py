import asyncio

from loguru import logger
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.factory import session_factory
from module.service.plex import PlexService

POLL_INTERVAL_SECONDS = 30


class PlexRefreshWorker:
    def __init__(
        self,
        *,
        wake_event: asyncio.Event,
        sessions: async_sessionmaker[AsyncSession] = session_factory,
        poll_interval: float = POLL_INTERVAL_SECONDS,
    ):
        self.poll_interval = poll_interval
        self._wake_event = wake_event
        self._sessions = sessions

    def wake(self) -> None:
        self._wake_event.set()

    async def run(self) -> None:
        self.wake()
        while True:
            await self._wake_event.wait()
            self._wake_event.clear()
            while True:
                try:
                    has_pending = await self.run_once()
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    logger.warning(
                        "[PlexRefresh] Queue cycle failed ({}: {})",
                        type(exc).__name__,
                        exc,
                    )
                    has_pending = True
                if not has_pending:
                    break
                await asyncio.sleep(self.poll_interval)
                self._wake_event.clear()

    async def run_once(self) -> bool:
        async with self._sessions() as session:
            jobs = await PlexService(session).list_refresh_jobs()
        for job in jobs:
            async with self._sessions() as session:
                service = PlexService(session)
                try:
                    if not await service.refresh_path(job.path):
                        return False
                    logger.info("[PlexRefresh] Plex accepted refresh for {}", job.path)
                    await service.complete_refresh_job(job)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    logger.warning(
                        "[PlexRefresh] Job attempt failed for {} ({})",
                        job.path,
                        type(exc).__name__,
                    )
        async with self._sessions() as session:
            return await PlexService(session).has_refresh_jobs()
