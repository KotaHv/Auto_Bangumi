from sqlalchemy import text
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models import Bangumi, User

from .bangumi import BangumiDatabase
from .engine import engine as e
from .rss import RSSDatabase
from .torrent import TorrentDatabase
from .user import UserDatabase


class Database(AsyncSession):
    def __init__(self, engine=e):
        self.engine = engine
        super().__init__(engine, expire_on_commit=False)
        self.rss = RSSDatabase(self)
        self.torrent = TorrentDatabase(self)
        self.bangumi = BangumiDatabase(self)
        self.user = UserDatabase(self)

    async def create_table(self):
        async with self.engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

    async def drop_table(self):
        async with self.engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.drop_all)

    async def migrate(self):
        # Run migration online
        bangumi_data = await self.bangumi.search_all()
        # sqlmodel exec() overloads don't accept TextClause, but it works at runtime
        user_data = (
            (
                await self.exec(text("SELECT * FROM user"))  # type: ignore[reportCallIssue, reportArgumentType]
            )
            .mappings()
            .all()
        )
        readd_bangumi = []
        for bangumi in bangumi_data:
            dict_data = bangumi.model_dump()
            del dict_data["id"]
            readd_bangumi.append(Bangumi(**dict_data))
        await self.drop_table()
        await self.create_table()
        await self.commit()
        bangumi_data = await self.bangumi.search_all()
        await self.bangumi.add_all(readd_bangumi)
        self.add(User(**dict(user_data[0]._mapping)))
        await self.commit()
