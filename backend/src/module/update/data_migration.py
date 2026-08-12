from loguru import logger
from sqlalchemy.sql import text

from module.models import Torrent
from module.network import RequestContent
from module.rss import RSSEngine
from module.utils import torrent_hash


async def torrent_migration():
    async with RSSEngine() as db:
        async with RequestContent() as req:
            torrents = (
                (
                    # sqlmodel exec() overloads don't accept TextClause, but it works at runtime
                    await db.exec(text("SELECT * FROM torrent"))  # type: ignore[reportCallIssue, reportArgumentType]
                )
                .mappings()
                .all()
            )
            torrents = [dict(torrent) for torrent in torrents]
            for torrent in torrents:
                if torrent.get("hash") or torrent.get("bangumi_id") is None:
                    continue
                logger.debug("Get {} Hash", torrent["name"])
                url = torrent["url"]
                if url.startswith("magnet"):
                    info_hash = torrent_hash.from_magnet(url)
                else:
                    content = await req.get_content(url)
                    if content is None:
                        continue
                    info_hash = torrent_hash.from_torrent(content)
                torrent["hash"] = info_hash
            readd_torrents = [Torrent(**torrent) for torrent in torrents]
            table = Torrent.__table__  # type: ignore[attr-defined]
            await db.run_sync(lambda session: table.drop(session.get_bind()))
            await db.run_sync(lambda session: table.create(session.get_bind()))
            await db.commit()
            await db.torrent.add_all(readd_torrents)
            await db.commit()
