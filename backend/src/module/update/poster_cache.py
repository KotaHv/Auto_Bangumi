from pathlib import Path

from module.conf import POSTERS_PATH
from module.parser import TitleParser
from module.rss import RSSEngine


async def ensure_poster_cache():
    POSTERS_PATH.mkdir(parents=True, exist_ok=True)
    async with RSSEngine() as db:
        bangumis = await db.bangumi.search_all()
        changed = []
        parser = TitleParser()
        for bangumi in bangumis:
            if bangumi.poster_link and (Path("data") / bangumi.poster_link).exists():
                continue

            bangumi.poster_link = None
            if bangumi.id is not None:
                homepage = await db.torrent.get_homepage_by_bangumi_id(bangumi.id)
                if homepage is not None:
                    poster_link, _ = await parser.mikan_parser(homepage)
                    if poster_link:
                        bangumi.poster_link = poster_link

            if bangumi.poster_link is None:
                await parser.tmdb_poster_parser(bangumi)
            changed.append(bangumi)

        if changed:
            await db.bangumi.update_all(changed)
