from module.rss import RSSEngine


async def update_main_rss(rss_link: str):
    async with RSSEngine() as engine:
        await engine.add_rss(rss_link, "main", True)
