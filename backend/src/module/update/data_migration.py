from loguru import logger
from sqlalchemy.sql import text

from module.models import Torrent
from module.network import RequestContent
from module.rss import RSSEngine
from module.utils import torrent_hash


def torrent_migration():
    with RSSEngine() as db, RequestContent() as req:
        engine = db.engine
        torrents = db.execute(text("SELECT * FROM torrent")).mappings().all()
        torrents = [dict(torrent) for torrent in torrents]
        for torrent in torrents:
            if torrent.get("hash") or torrent.get("bangumi_id") is None:
                continue
            logger.debug(f"Get {torrent['name']} Hash")
            url = torrent["url"]
            if url.startswith("magnet"):
                info_hash = torrent_hash.from_magnet(url)
            else:
                content = req.get_content(url)
                if content is None:
                    continue
                info_hash = torrent_hash.from_torrent(content)
            torrent["hash"] = info_hash
        readd_torrents = [Torrent(**torrent) for torrent in torrents]
        table = Torrent.__table__  # type: ignore[attr-defined]
        table.drop(engine)
        table.create(engine)
        db.commit()
        db.torrent.add_all(readd_torrents)
        db.commit()
