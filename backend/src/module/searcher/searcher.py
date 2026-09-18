import xml.etree.ElementTree
from collections.abc import AsyncIterator

from module.conf import settings
from module.models import Bangumi, RSSItem, SearchResult, Torrent
from module.network import RequestContent, UpstreamUnavailableError
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
    async def _get_titles(self, rss_item: RSSItem) -> list[str]:
        try:
            soup = await self.get_xml(rss_item.url)
        except xml.etree.ElementTree.ParseError as error:
            raise UpstreamUnavailableError from error
        if soup is None:
            raise UpstreamUnavailableError

        try:
            titles = []
            for item in soup.findall("./channel/item"):
                title = item.findtext("title")
                if not title:
                    raise ValueError
                titles.append(title)
            return titles
        except (AttributeError, TypeError, ValueError) as error:
            raise UpstreamUnavailableError from error

    async def analyse_keyword(
        self, keywords: list[str], site: str = "mikan"
    ) -> AsyncIterator[BangumiJSON]:
        rss_item = search_url(site, keywords)
        titles = await self._get_titles(rss_item)
        seen_links = set()
        previews: dict[str, tuple[str, int, str | None, str | None]] = {}
        for title in titles:
            bangumi = await self.raw_parser(raw=title)
            if bangumi is None:
                continue

            rss = self.special_url(bangumi, site)
            if rss.url in seen_links:
                continue
            seen_links.add(rss.url)

            preview = previews.get(bangumi.official_title)
            if preview is None:
                preview = await self.tmdb_parser(
                    bangumi.official_title,
                    bangumi.season,
                    settings.rss_parser.language,
                )
                previews[bangumi.official_title] = preview
            (
                bangumi.official_title,
                bangumi.season,
                bangumi.year,
                bangumi.poster_link,
            ) = preview
            bangumi.rss_link = rss.url
            yield SearchResult(bangumi=bangumi, rss=rss).model_dump_json()

    @staticmethod
    def special_url(data: Bangumi, site: str) -> RSSItem:
        keywords = [getattr(data, key) for key in SEARCH_KEY if getattr(data, key)]
        url = search_url(site, keywords)
        return url

    async def search_season(self, data: Bangumi, site: str = "mikan") -> list[Torrent]:
        rss_item = self.special_url(data, site)
        torrents = await self.get_torrents(rss_item.url, data.filter.replace(",", "|"))
        return [torrent for torrent in torrents if data.title_raw in torrent.name]
