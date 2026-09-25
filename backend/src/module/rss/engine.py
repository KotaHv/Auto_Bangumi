from module.database import Database, engine
from module.models import RSSItem, Torrent
from module.network import RequestContent


class RSSEngine(Database):
    def __init__(self, _engine=engine):
        super().__init__(_engine)

    @staticmethod
    async def _get_torrents(rss: RSSItem) -> list[Torrent]:
        async with RequestContent() as req:
            torrents = await req.get_torrents(rss.url)
            # Add RSS ID
            for torrent in torrents:
                torrent.rss_id = rss.id
        return torrents

    async def get_rss_torrents(self, rss_id: int) -> list[Torrent]:
        rss = await self.rss.search_id(rss_id)
        if rss:
            return await self.torrent.search_rss(rss_id)
        else:
            return []

    async def pull_rss(self, rss_item: RSSItem) -> list[Torrent]:
        torrents = await self._get_torrents(rss_item)
        new_torrents = await self.torrent.check_new(torrents)
        return new_torrents
