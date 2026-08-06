from module.network import RequestContent
from module.rss import RSSEngine
from module.utils import save_image


def cache_image():
    with RSSEngine() as db, RequestContent() as req:
        bangumis = db.bangumi.search_all()
        for bangumi in bangumis:
            if bangumi.poster_link:
                # Hash local path
                img = req.get_content(bangumi.poster_link)
                suffix = bangumi.poster_link.split(".")[-1]
                img_path = save_image(img, suffix)
                bangumi.poster_link = img_path
        db.bangumi.update_all(bangumis)
