from loguru import logger
from sqlalchemy.sql import func
from sqlmodel import and_, col, delete, false, literal, select
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models import Bangumi, BangumiUpdate


class BangumiDatabase:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, data: Bangumi) -> bool:
        statement = select(Bangumi).where(Bangumi.title_raw == data.title_raw)
        bangumi = (await self.session.exec(statement)).first()
        if bangumi:
            data.id = bangumi.id
            return False
        self.session.add(data)
        logger.debug("[Database] Stage {} for insertion.", data.official_title)
        return True

    async def add_all(self, datas: list[Bangumi]):
        self.session.add_all(datas)
        logger.debug("[Database] Stage {} bangumi for insertion.", len(datas))

    async def update(
        self, data: Bangumi | BangumiUpdate, _id: int | None = None
    ) -> bool:
        if _id and isinstance(data, BangumiUpdate):
            db_data = await self.session.get(Bangumi, _id)
        elif isinstance(data, Bangumi):
            db_data = await self.session.get(Bangumi, data.id)
        else:
            return False
        if db_data is None:
            return False
        bangumi_data = data.model_dump(exclude_unset=True)
        for key, value in bangumi_data.items():
            setattr(db_data, key, value)
        self.session.add(db_data)
        logger.debug("[Database] Stage update for {}", data.official_title)
        return True

    async def update_all(self, datas: list[Bangumi]):
        self.session.add_all(datas)
        logger.debug("[Database] Stage updates for {} bangumi.", len(datas))

    async def delete_one(self, _id: int) -> bool:
        result = await self.session.exec(
            delete(Bangumi).where(col(Bangumi.id) == _id).returning(col(Bangumi.id))
        )
        deleted_id = result.scalars().first()
        if deleted_id is None:
            return False
        logger.debug("[Database] Delete bangumi id: {}.", _id)
        return True

    def set_rss_link(self, bangumi: Bangumi, rss_link: str) -> None:
        bangumi.rss_link = rss_link
        self.session.add(bangumi)

    async def delete_all(self):
        statement = delete(Bangumi)
        await self.session.exec(statement)

    async def search_all(self) -> list[Bangumi]:
        statement = select(Bangumi)
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

    async def match_list(self, torrent_list: list, rss_link: str) -> list:
        match_datas = await self.search_all()
        if not match_datas:
            return torrent_list
        # Match title
        i = 0
        while i < len(torrent_list):
            torrent = torrent_list[i]
            for match_data in match_datas:
                if match_data.title_raw in torrent.name:
                    rss_members = [
                        member
                        for member in (match_data.rss_link or "").split(",")
                        if member
                    ]
                    if rss_link and rss_link not in rss_members:
                        rss_members.append(rss_link)
                        self.set_rss_link(match_data, ",".join(rss_members))
                        match_data.added = False
                    torrent_list.pop(i)
                    break
            else:
                i += 1
        return torrent_list

    async def match_torrent(self, torrent_name: str) -> Bangumi | None:
        statement = select(Bangumi).where(
            and_(
                func.instr(torrent_name, Bangumi.title_raw) > 0,
                # use `false()` to avoid E712 checking
                # see: https://docs.astral.sh/ruff/rules/true-false-comparison/
                Bangumi.deleted == false(),
            )
        )
        return (await self.session.exec(statement)).first()

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

    async def search_rss(self, rss_link: str) -> list[Bangumi]:
        if not rss_link:
            return []
        members = literal(",") + func.coalesce(Bangumi.rss_link, "") + literal(",")
        target = literal(f",{rss_link},")
        statement = select(Bangumi).where(func.instr(members, target) > 0)
        return list((await self.session.exec(statement)).all())

    async def get_offset(self, _id: int) -> int:
        offset = (
            await self.session.exec(select(Bangumi.offset).where(Bangumi.id == _id))
        ).first()
        return 0 if offset is None else offset
