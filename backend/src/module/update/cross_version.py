from module.network import RequestContent
from module.rss import RSSEngine
from module.utils import save_image


async def cache_image():
    async with RSSEngine() as db:
        async with RequestContent() as req:
            bangumis = await db.bangumi.search_all()
            for bangumi in bangumis:
                if bangumi.poster_link:
                    # Hash local path
                    img = await req.get_content(bangumi.poster_link)
                    suffix = bangumi.poster_link.split(".")[-1]
                    img_path = await save_image(img, suffix)
                    bangumi.poster_link = img_path
            await db.bangumi.update_all(bangumis)
