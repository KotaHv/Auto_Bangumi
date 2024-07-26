from typing import Optional

from loguru import logger
from sqlmodel import Session, and_, desc, select

from module.models import Torrent


class TorrentDatabase:
    def __init__(self, session: Session):
        self.session = session

    def add(self, data: Torrent):
        result = self.session.exec(
            select(Torrent).where(Torrent.hash == data.hash)
        ).first()
        if result is None:
            result = data
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(result, key, value)
        self.session.add(result)
        self.session.commit()
        self.session.refresh(result)
        logger.debug(f"Insert {result.name} in database.")

    def add_all(self, datas: list[Torrent]):
        for index, data in enumerate(datas):
            result = self.session.exec(
                select(Torrent).where(Torrent.hash == data.hash)
            ).first()
            if result:
                for key, value in data.model_dump(exclude_unset=True).items():
                    setattr(result, key, value)
                datas[index] = result
        self.session.add_all(datas)
        self.session.commit()
        logger.debug(f"Insert {len(datas)} torrents in database.")

    def update(self, data: Torrent):
        self.session.add(data)
        self.session.commit()
        self.session.refresh(data)
        logger.debug(f"Update {data.name} in database.")

    def update_all(self, datas: list[Torrent]):
        self.session.add_all(datas)
        self.session.commit()

    def update_one_user(self, data: Torrent):
        self.session.add(data)
        self.session.commit()
        self.session.refresh(data)
        logger.debug(f"Update {data.name} in database.")

    def search(self, _id: int) -> Torrent:
        return self.session.exec(select(Torrent).where(Torrent.id == _id)).first()

    def search_all(self) -> list[Torrent]:
        return self.session.exec(select(Torrent)).all()

    def search_all_downloaded(self) -> list[Torrent]:
        return self.session.exec(select(Torrent).where(Torrent.downloaded)).all()

    def search_rss(self, rss_id: int) -> list[Torrent]:
        return self.session.exec(select(Torrent).where(Torrent.rss_id == rss_id)).all()

    def search_bangumi(self, bangumi_id: int) -> list[Torrent]:
        return self.session.exec(
            select(Torrent).where(Torrent.bangumi_id == bangumi_id)
        ).all()

    def check_new(self, torrents_list: list[Torrent]) -> list[Torrent]:
        new_torrents = []
        downloaded_torrents = self.search_all_downloaded()
        downloaded_url = [t.url for t in downloaded_torrents]
        for torrent in torrents_list:
            if torrent.url not in downloaded_url:
                new_torrents.append(torrent)
        return new_torrents

    def get_bangumi_id(self, torrent_hash: str) -> Optional[int]:
        return self.session.exec(
            select(Torrent.bangumi_id)
            .where(and_(Torrent.hash == torrent_hash, Torrent.bangumi_id.isnot(None)))
            .order_by(desc(Torrent.id))
        ).first()

    def delete_by_bangumi_id(self, bangumi_id: int):
        statement = select(Torrent).where(Torrent.bangumi_id == bangumi_id)
        torrents = self.session.exec(statement).all()
        for torrent in torrents:
            logger.debug(f"[Database] Delete torrent name: {torrent.name}.")
            self.session.delete(torrent)
        self.session.commit()
