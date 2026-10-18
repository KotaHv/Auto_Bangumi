from typing import cast

from loguru import logger
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import InstrumentedAttribute
from sqlmodel import col, delete, select, true, update
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models import Bangumi, BangumiRSS, RSSItem, RSSUpdate


class RSSDatabase:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, data: RSSItem) -> bool:
        statement = select(RSSItem).where(RSSItem.url == data.url)
        db_data = (await self.session.exec(statement)).first()
        if db_data:
            logger.debug("RSS Item {} already exists.", data.url)
            return False
        logger.debug("Stage RSS item {} for insertion.", data.url)
        self.session.add(data)
        await self.session.flush()
        return True

    async def add_all(self, data: list[RSSItem]):
        for item in data:
            await self.add(item)

    async def update(self, _id: int, data: RSSUpdate):
        # Check if exists
        statement = select(RSSItem).where(RSSItem.id == _id)
        db_data = (await self.session.exec(statement)).first()
        if not db_data:
            return False
        # Update
        dict_data = data.model_dump(exclude_unset=True)
        for key, value in dict_data.items():
            setattr(db_data, key, value)
        self.session.add(db_data)
        return True

    async def set_enabled_many(self, rss_ids: list[int], enabled: bool) -> bool:
        ids = set(rss_ids)
        if not ids:
            return True
        result = await self.session.exec(
            update(RSSItem).where(col(RSSItem.id).in_(ids)).values(enabled=enabled)
        )
        return result.rowcount == len(ids)

    async def delete_one(self, _id: int) -> bool:
        await self.session.exec(delete(BangumiRSS).where(col(BangumiRSS.rss_id) == _id))
        result = await self.session.exec(delete(RSSItem).where(col(RSSItem.id) == _id))
        logger.debug("[Database] Delete RSS id: {}.", _id)
        return result.rowcount > 0

    async def delete_many(self, rss_ids: list[int]) -> bool:
        ids = set(rss_ids)
        if not ids:
            return True
        for rss_id in ids:
            if not await self.delete_one(rss_id):
                raise ValueError(f"RSS item {rss_id} does not exist")
        return True

    async def enable(self, _id: int):
        statement = select(RSSItem).where(RSSItem.id == _id)
        db_data = (await self.session.exec(statement)).first()
        if not db_data:
            return False
        db_data.enabled = True
        self.session.add(db_data)
        return True

    async def disable(self, _id: int):
        statement = select(RSSItem).where(RSSItem.id == _id)
        db_data = (await self.session.exec(statement)).first()
        if not db_data:
            return False
        db_data.enabled = False
        self.session.add(db_data)
        return True

    async def search_id(self, _id: int) -> RSSItem | None:
        return await self.session.get(RSSItem, _id)

    async def search_id_with_bangumis(self, _id: int) -> RSSItem | None:
        bangumis = cast(InstrumentedAttribute[list[Bangumi]], RSSItem.bangumis)
        rss_items = cast(InstrumentedAttribute[list[RSSItem]], Bangumi.rss_items)
        statement = (
            select(RSSItem)
            .where(RSSItem.id == _id)
            .options(selectinload(bangumis).selectinload(rss_items))
        )
        return (await self.session.exec(statement)).first()

    async def search_all(self) -> list[RSSItem]:
        return list((await self.session.exec(select(RSSItem))).all())

    async def search_active(self) -> list[RSSItem]:
        statement = select(RSSItem).where(RSSItem.enabled == true())
        return list((await self.session.exec(statement)).all())

    async def search_active_with_bangumis(self) -> list[RSSItem]:
        bangumis = cast(InstrumentedAttribute[list[Bangumi]], RSSItem.bangumis)
        rss_items = cast(InstrumentedAttribute[list[RSSItem]], Bangumi.rss_items)
        statement = (
            select(RSSItem)
            .where(RSSItem.enabled == true())
            .options(selectinload(bangumis).selectinload(rss_items))
        )
        return list((await self.session.exec(statement)).all())

    async def search_url(self, url: str) -> RSSItem | None:
        return (
            await self.session.exec(select(RSSItem).where(RSSItem.url == url))
        ).first()

    async def delete_all(self):
        condition = delete(RSSItem)
        await self.session.exec(condition)
