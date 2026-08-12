from module.conf import POSTERS_PATH
from module.rss import RSSEngine


async def first_run():
    async with RSSEngine() as engine:
        await engine.create_table()
        await engine.user.add_default_user()
    POSTERS_PATH.mkdir(parents=True, exist_ok=True)
