from module.rss import RSSEngine


async def ensure_default_user() -> bool:
    async with RSSEngine() as engine:
        return await engine.user.ensure_default_user()
