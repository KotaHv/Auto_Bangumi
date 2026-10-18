from typing import cast

from loguru import logger
from sqlalchemy.orm import lazyload
from sqlalchemy.orm.attributes import InstrumentedAttribute
from sqlalchemy.sql import func
from sqlmodel import and_, col, delete, false, or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models import Bangumi, BangumiRSS, RSSItem


class BangumiDatabase:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, data: Bangumi) -> None:
        self.session.add(data)
        await self.session.flush()
        logger.debug("[Database] Insert {}.", data.official_title)

    async def add_all(self, datas: list[Bangumi]):
        self.session.add_all(datas)
        logger.debug("[Database] Stage {} bangumi for insertion.", len(datas))

    async def update(self, data: Bangumi) -> bool:
        if data.id is None:
            return False
        db_data = await self.session.get(Bangumi, data.id)
        if db_data is None:
            return False
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(db_data, key, value)
        self.session.add(db_data)
        logger.debug("[Database] Stage update for {}", db_data.official_title)
        return True

    async def update_all(self, datas: list[Bangumi]):
        self.session.add_all(datas)
        logger.debug("[Database] Stage updates for {} bangumi.", len(datas))

    async def delete_one(self, _id: int) -> bool:
        await self.session.exec(
            delete(BangumiRSS).where(col(BangumiRSS.bangumi_id) == _id)
        )
        result = await self.session.exec(
            delete(Bangumi).where(col(Bangumi.id) == _id).returning(col(Bangumi.id))
        )
        deleted_id = result.scalars().first()
        if deleted_id is None:
            return False
        logger.debug("[Database] Delete bangumi id: {}.", _id)
        return True

    async def delete_all(self):
        await self.session.exec(delete(BangumiRSS))
        await self.session.exec(delete(Bangumi))

    async def search_all(self) -> list[Bangumi]:
        return list((await self.session.exec(select(Bangumi))).all())

    async def search_all_without_rss_items(self) -> list[Bangumi]:
        rss_items = cast(InstrumentedAttribute[list[RSSItem]], Bangumi.rss_items)
        statement = select(Bangumi).options(lazyload(rss_items))
        return list((await self.session.exec(statement)).all())

    async def find_by_raw_title_season_group(
        self, title_raw: str, season: int, group_name: str | None
    ) -> list[Bangumi]:
        statement = select(Bangumi).where(
            Bangumi.title_raw == title_raw,
            Bangumi.season == season,
            Bangumi.group_name == group_name,
        )
        return list((await self.session.exec(statement)).all())

    async def find_for_rss_analysis(self, bangumi: Bangumi) -> Bangumi | None:
        statement = select(Bangumi).where(
            Bangumi.title_raw == bangumi.title_raw,
            Bangumi.season_raw == bangumi.season_raw,
            Bangumi.season == bangumi.season,
            Bangumi.group_name == bangumi.group_name,
        )
        return (await self.session.exec(statement)).first()

    async def find_by_official_or_raw_title(
        self, official_title: str, title_raw: str
    ) -> list[Bangumi]:
        conditions = []
        if official_title:
            conditions.append(Bangumi.official_title == official_title)
        if title_raw:
            conditions.append(Bangumi.title_raw == title_raw)
        if not conditions:
            return []
        statement = select(Bangumi).where(or_(*conditions))
        return list((await self.session.exec(statement)).all())

    async def search_id(self, _id: int) -> Bangumi | None:
        statement = select(Bangumi).where(Bangumi.id == _id)
        bangumi = (await self.session.exec(statement)).first()
        if bangumi is None:
            logger.warning("[Database] Cannot find bangumi id: {}.", _id)
            return None
        else:
            logger.debug("[Database] Find bangumi id: {}.", _id)
            return (await self.session.exec(statement)).first()

    async def match_poster(self, bangumi_name: str) -> str | None:
        # Use like to match
        statement = select(Bangumi).where(
            func.instr(bangumi_name, Bangumi.official_title) > 0
        )
        data = (await self.session.exec(statement)).first()
        if data:
            return data.poster_link
        else:
            return ""

    async def not_complete(self) -> list[Bangumi]:
        # Find eps_complete = False
        # use `false()` to avoid E712 checking
        # see: https://docs.astral.sh/ruff/rules/true-false-comparison/
        condition = select(Bangumi).where(
            and_(Bangumi.eps_collect == false(), Bangumi.deleted == false())
        )
        datas = (await self.session.exec(condition)).all()
        return list(datas)

    async def disable_rule(self, _id: int):
        statement = select(Bangumi).where(Bangumi.id == _id)
        bangumi = (await self.session.exec(statement)).first()
        if bangumi is None:
            return
        bangumi.deleted = True
        self.session.add(bangumi)
        logger.debug("[Database] Disable rule {}.", bangumi.title_raw)

    async def get_offset(self, _id: int) -> int:
        offset = (
            await self.session.exec(select(Bangumi.offset).where(Bangumi.id == _id))
        ).first()
        return 0 if offset is None else offset
