import re

from loguru import logger

from module.conf import settings
from module.models import Bangumi, ResponseModel, RSSItem, Torrent
from module.network import RequestContent
from module.parser import TitleParser


class RSSAnalyser(TitleParser):
    async def official_title_parser(
        self, bangumi: Bangumi, rss: RSSItem, torrent: Torrent
    ):
        if rss.parser == "mikan":
            if torrent.homepage is None:
                logger.warning("[Parser] Mikan torrent has no homepage info.")
            else:
                try:
                    (
                        bangumi.poster_link,
                        bangumi.official_title,
                    ) = await self.mikan_parser(torrent.homepage)
                except Exception as e:
                    logger.warning(
                        "[Parser] Mikan parser failed with error: {}. Use raw title instead.",
                        e,
                    )
        elif rss.parser == "tmdb":
            tmdb_title, season, year, poster_link = await self.tmdb_parser(
                bangumi.official_title, bangumi.season, settings.rss_parser.language
            )
            bangumi.official_title = tmdb_title
            bangumi.year = year
            bangumi.season = season
            bangumi.poster_link = poster_link
        else:
            pass
        bangumi.official_title = re.sub(r"[/:.\\]", " ", bangumi.official_title)

    @staticmethod
    async def get_rss_torrents(rss_link: str, full_parse: bool = True) -> list[Torrent]:
        async with RequestContent() as req:
            if full_parse:
                rss_torrents = await req.get_torrents(rss_link)
            else:
                rss_torrents = await req.get_torrents(rss_link, "\\d+-\\d+")
        return rss_torrents

    async def torrents_to_data(
        self, torrents: list[Torrent], rss: RSSItem, full_parse: bool = True
    ) -> list:
        new_data = []
        for torrent in torrents:
            bangumi = await self.raw_parser(raw=torrent.name)
            if bangumi and bangumi.title_raw not in [i.title_raw for i in new_data]:
                await self.official_title_parser(
                    bangumi=bangumi, rss=rss, torrent=torrent
                )
                if not full_parse:
                    return [bangumi]
                new_data.append(bangumi)
                logger.info("[RSS] New bangumi founded: {}", bangumi.official_title)
        return new_data

    async def torrent_to_data(self, torrent: Torrent, rss: RSSItem) -> Bangumi | None:
        bangumi = await self.raw_parser(raw=torrent.name)
        if bangumi:
            await self.official_title_parser(bangumi=bangumi, rss=rss, torrent=torrent)
            bangumi.rss_link = rss.url
            return bangumi

    async def link_to_data(self, rss: RSSItem) -> Bangumi | ResponseModel:
        torrents = await self.get_rss_torrents(rss.url, False)
        if not torrents:
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en="Cannot find any torrent.",
                msg_zh="无法找到种子。",
            )
        for torrent in torrents:
            data = await self.torrent_to_data(torrent, rss)
            if data:
                return data
        return ResponseModel(
            status=False,
            status_code=406,
            msg_en="Cannot parse this link.",
            msg_zh="无法解析此链接。",
        )
