import json
import re
from collections.abc import AsyncIterator

import lxml.etree as etree
from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from module.conf import SEARCH_CONFIG, settings
from module.exceptions import SearchUpstreamError, UnsupportedProviderError
from module.models import Bangumi, RSSItem, SearchResult, Torrent
from module.network import RequestContent
from module.parser import TitleParser
from module.service.rss import RssService

SEARCH_KEY = [
    "group_name",
    "title_raw",
    "season_raw",
    "subtitle",
    "source",
    "dpi",
]


def search_url(site: str, keywords: list[str]) -> RSSItem:
    keyword = "+".join(keywords)
    search_str = re.sub(r"[\W_ ]", "+", keyword)
    if site in SEARCH_CONFIG.keys():
        url = re.sub(r"%s", search_str, SEARCH_CONFIG[site])
        parser = "mikan" if site == "mikan" else "tmdb"
        rss_item = RSSItem(
            url=url,
            aggregate=False,
            parser=parser,
        )
        return rss_item
    else:
        raise UnsupportedProviderError(site)


class SearchService:
    def __init__(self, session: AsyncSession) -> None:
        self.parser = TitleParser()
        self.rss = RssService(session)

    async def search_events(
        self, keywords: list[str], site: str = "mikan"
    ) -> AsyncIterator[dict[str, str]]:
        try:
            async for result in self._analyse_keyword(keywords, site):
                yield {"data": result.model_dump_json()}
        except UnsupportedProviderError:
            yield {"event": "failure", "data": json.dumps({"code": "invalid_provider"})}
        except SearchUpstreamError:
            yield {
                "event": "failure",
                "data": json.dumps({"code": "upstream_unavailable"}),
            }
        except Exception:
            logger.exception("[Search] Search failed")
            yield {"event": "failure", "data": json.dumps({"code": "internal_error"})}
        else:
            yield {"event": "complete", "data": ""}

    async def _analyse_keyword(
        self, keywords: list[str], site: str
    ) -> AsyncIterator[SearchResult]:
        rss_item = search_url(site, keywords)
        titles = await self._get_titles(rss_item)
        seen_links: set[str] = set()
        previews: dict[str, tuple[str, int, str | None, str | None]] = {}
        for title in titles:
            bangumi = await self.parser.raw_parser(raw=title)
            if bangumi is None:
                continue

            rss = self.special_url(bangumi, site)
            if rss.url in seen_links:
                continue
            seen_links.add(rss.url)

            preview = previews.get(bangumi.official_title)
            if preview is None:
                preview = await self.parser.tmdb_parser(
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
            bangumi.rss_items = [rss]
            options = await self.rss.analysis_options(bangumi)
            yield SearchResult(options=options, rss=rss)

    async def _get_titles(self, rss_item: RSSItem) -> list[str]:
        async with RequestContent() as req:
            try:
                soup = await req.get_xml(rss_item.url)
            except etree.XMLSyntaxError as error:
                raise SearchUpstreamError from error
        if soup is None:
            raise SearchUpstreamError

        try:
            titles = []
            for item in soup.findall("./channel/item"):
                title = item.findtext("title")
                if not title:
                    raise ValueError
                titles.append(title)
            return titles
        except (AttributeError, TypeError, ValueError) as error:
            raise SearchUpstreamError from error

    @staticmethod
    def special_url(data: Bangumi, site: str) -> RSSItem:
        keywords = [getattr(data, key) for key in SEARCH_KEY if getattr(data, key)]
        url = search_url(site, keywords)
        return url

    async def search_season(self, data: Bangumi, site: str = "mikan") -> list[Torrent]:
        rss_item = self.special_url(data, site)
        async with RequestContent() as req:
            torrents = await req.get_torrents(
                rss_item.url, data.filter.replace(",", "|")
            )
        return [torrent for torrent in torrents if data.title_raw in torrent.name]
