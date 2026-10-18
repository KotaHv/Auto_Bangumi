from sqlmodel import col, delete, select
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models import BangumiRSS


class BangumiRSSDatabase:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def append(self, bangumi_id: int, rss_id: int) -> bool:
        existing = await self.session.exec(
            select(BangumiRSS).where(
                col(BangumiRSS.bangumi_id) == bangumi_id,
                col(BangumiRSS.rss_id) == rss_id,
            )
        )
        if existing.first() is not None:
            return False

        self.session.add(BangumiRSS(bangumi_id=bangumi_id, rss_id=rss_id))
        await self.session.flush()
        return True

    async def remove(self, bangumi_id: int, rss_id: int) -> None:
        await self.session.exec(
            delete(BangumiRSS).where(
                col(BangumiRSS.bangumi_id) == bangumi_id,
                col(BangumiRSS.rss_id) == rss_id,
            )
        )
