from loguru import logger
from sqlmodel import and_, desc, select
from sqlmodel.ext.asyncio.session import AsyncSession

from module.models import Torrent


class TorrentDatabase:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, data: Torrent):
        result = (
            await self.session.exec(select(Torrent).where(Torrent.url == data.url))
        ).first()
        if result is None:
            result = data
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(result, key, value)
        self.session.add(result)
        await self.session.commit()
        await self.session.refresh(result)
        logger.debug(f"Insert {result.name} in database.")

    async def add_all(self, datas: list[Torrent]):
        for index, data in enumerate(datas):
            result = (
                await self.session.exec(select(Torrent).where(Torrent.url == data.url))
            ).first()
            if result:
                for key, value in data.model_dump(exclude_unset=True).items():
                    setattr(result, key, value)
                datas[index] = result
        self.session.add_all(datas)
        await self.session.commit()
        logger.debug(f"Insert {len(datas)} torrents in database.")

    async def update(self, data: Torrent):
        self.session.add(data)
        await self.session.commit()
        await self.session.refresh(data)
        logger.debug(f"Update {data.name} in database.")

    async def update_all(self, datas: list[Torrent]):
        self.session.add_all(datas)
        await self.session.commit()

    async def search(self, _id: int) -> Torrent | None:
        return (
            await self.session.exec(select(Torrent).where(Torrent.id == _id))
        ).first()

    async def search_all(self) -> list[Torrent]:
        return list((await self.session.exec(select(Torrent))).all())

    async def search_all_downloaded(self) -> list[Torrent]:
        return list(
            (await self.session.exec(select(Torrent).where(Torrent.downloaded))).all()
        )

    async def search_rss(self, rss_id: int) -> list[Torrent]:
        return list(
            (
                await self.session.exec(select(Torrent).where(Torrent.rss_id == rss_id))
            ).all()
        )

    async def search_bangumi(self, bangumi_id: int) -> list[Torrent]:
        return list(
            (
                await self.session.exec(
                    select(Torrent).where(Torrent.bangumi_id == bangumi_id)
                )
            ).all()
        )

    async def check_new(self, torrents_list: list[Torrent]) -> list[Torrent]:
        new_torrents = []
        downloaded_torrents = await self.search_all_downloaded()
        downloaded_url = [t.url for t in downloaded_torrents]
        for torrent in torrents_list:
            if torrent.url not in downloaded_url:
                new_torrents.append(torrent)
        return new_torrents

    async def get_bangumi_id(self, torrent_hash: str) -> int | None:
        return (
            await self.session.exec(
                select(Torrent.bangumi_id)
                .where(
                    and_(
                        Torrent.hash == torrent_hash,
                        Torrent.bangumi_id.isnot(None),  # type: ignore[attr-defined, optional-member-access]
                    )
                )
                .order_by(desc(Torrent.id))
            )
        ).first()

    async def delete_by_bangumi_id(self, bangumi_id: int):
        statement = select(Torrent).where(Torrent.bangumi_id == bangumi_id)
        torrents = (await self.session.exec(statement)).all()
        for torrent in torrents:
            logger.debug(f"[Database] Delete torrent name: {torrent.name}.")
            await self.session.delete(torrent)
        await self.session.commit()
