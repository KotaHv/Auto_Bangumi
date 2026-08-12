from collections.abc import AsyncIterator

from module.models import Bangumi, RSSItem, Torrent
from module.network import RequestContent
from module.rss import RSSAnalyser

from .provider import search_url

SEARCH_KEY = [
    "group_name",
    "title_raw",
    "season_raw",
    "subtitle",
    "source",
    "dpi",
]

type BangumiJSON = str


class SearchTorrent(RequestContent, RSSAnalyser):
    async def search_torrents(self, rss_item: RSSItem) -> list[Torrent]:
        return await self.get_torrents(rss_item.url)
        # torrents = self.get_torrents(rss_item.url)
        # return torrents

    async def analyse_keyword(
        self, keywords: list[str], site: str = "mikan", limit: int = 5
    ) -> AsyncIterator[BangumiJSON]:
        rss_item = search_url(site, keywords)
        torrents = await self.search_torrents(rss_item)
        # yield for EventSourceResponse (Server Send)
        exist_list = []
        for torrent in torrents:
            if len(exist_list) >= limit:
                break
            bangumi = await self.torrent_to_data(torrent=torrent, rss=rss_item)
            if bangumi:
                special_link = self.special_url(bangumi, site).url
                if special_link not in exist_list:
                    bangumi.rss_link = special_link
                    exist_list.append(special_link)
                    yield bangumi.model_dump_json()

    @staticmethod
    def special_url(data: Bangumi, site: str) -> RSSItem:
        keywords = [getattr(data, key) for key in SEARCH_KEY if getattr(data, key)]
        url = search_url(site, keywords)
        return url

    async def search_season(self, data: Bangumi, site: str = "mikan") -> list[Torrent]:
        rss_item = self.special_url(data, site)
        # torrents = self.search_torrents(rss_item)
        torrents = await self.get_torrents(rss_item.url, data.filter.replace(",", "|"))
        return [torrent for torrent in torrents if data.title_raw in torrent.name]
