from collections.abc import Iterable
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import delete
from sqlalchemy.dialects.sqlite import insert
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models import PlexRefreshJob
from module.utils.log_time import to_microseconds


class PlexRefreshDatabase:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def enqueue(self, paths: Iterable[str]) -> None:
        now = to_microseconds(datetime.now(UTC))
        for path in dict.fromkeys(paths):
            revision = str(uuid4())
            statement = insert(PlexRefreshJob).values(
                path=path,
                revision=revision,
                created_at=now,
                updated_at=now,
            )
            statement = statement.on_conflict_do_update(
                index_elements=[PlexRefreshJob.path],
                set_={"revision": revision, "updated_at": now},
            )
            await self.session.exec(statement)

    async def clear(self) -> None:
        await self.session.exec(delete(PlexRefreshJob))

    async def get(self, path: str) -> PlexRefreshJob | None:
        return await self.session.get(PlexRefreshJob, path)

    async def has_jobs(self) -> bool:
        result = await self.session.exec(select(PlexRefreshJob.path).limit(1))
        return result.first() is not None

    async def list_jobs(self) -> list[PlexRefreshJob]:
        result = await self.session.exec(
            select(PlexRefreshJob).order_by(col(PlexRefreshJob.path))
        )
        return list(result.all())

    async def remove_if_current(self, job: PlexRefreshJob) -> bool:
        result = await self.session.exec(
            delete(PlexRefreshJob).where(
                col(PlexRefreshJob.path) == job.path,
                col(PlexRefreshJob.revision) == job.revision,
            )
        )
        return result.rowcount == 1
