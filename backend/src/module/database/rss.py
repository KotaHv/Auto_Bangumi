from loguru import logger
from sqlmodel import delete, select, true
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models import RSSItem, RSSUpdate


class RSSDatabase:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, data: RSSItem):
        # Check if exists
        statement = select(RSSItem).where(RSSItem.url == data.url)
        db_data = (await self.session.exec(statement)).first()
        if db_data:
            logger.debug("RSS Item {} already exists.", data.url)
            return False
        else:
            logger.debug("RSS Item {} not exists, adding...", data.url)
            self.session.add(data)
            await self.session.commit()
            await self.session.refresh(data)
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
        await self.session.commit()
        await self.session.refresh(db_data)
        return True

    async def enable(self, _id: int):
        statement = select(RSSItem).where(RSSItem.id == _id)
        db_data = (await self.session.exec(statement)).first()
        if not db_data:
            return False
        db_data.enabled = True
        self.session.add(db_data)
        await self.session.commit()
        await self.session.refresh(db_data)
        return True

    async def disable(self, _id: int):
        statement = select(RSSItem).where(RSSItem.id == _id)
        db_data = (await self.session.exec(statement)).first()
        if not db_data:
            return False
        db_data.enabled = False
        self.session.add(db_data)
        await self.session.commit()
        await self.session.refresh(db_data)
        return True

    async def search_id(self, _id: int) -> RSSItem | None:
        return await self.session.get(RSSItem, _id)

    async def search_all(self) -> list[RSSItem]:
        return list((await self.session.exec(select(RSSItem))).all())

    async def search_active(self) -> list[RSSItem]:
        return list(
            (
                await self.session.exec(
                    select(RSSItem).where(RSSItem.enabled == true())
                )
            ).all()
        )

    async def search_url(self, url: str) -> RSSItem | None:
        return (
            await self.session.exec(select(RSSItem).where(RSSItem.url == url))
        ).first()

    async def delete(self, _id: int) -> bool:
        condition = delete(RSSItem).where(RSSItem.id == _id)  # type: ignore[arg-type]
        try:
            await self.session.exec(condition)
            await self.session.commit()
            return True
        except Exception as e:
            logger.error("Delete RSS Item failed. Because: {}", e)
            return False

    async def delete_all(self):
        condition = delete(RSSItem)
        await self.session.exec(condition)
        await self.session.commit()
