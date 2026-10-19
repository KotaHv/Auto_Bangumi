import re

from loguru import logger

from module.conf import settings
from module.models import Bangumi, RSSItem, Torrent
from module.parser.analyser import (
    OpenAIParser,
    mikan_parser,
    raw_parser,
    tmdb_parser,
    torrent_name_parser,
    torrent_parser,
)


class TitleParser:
    def __init__(self):
        pass

    @staticmethod
    def torrent_parser(
        torrent_path: str,
        torrent_name: str | None = None,
        season: int | None = None,
        file_type: str = "media",
    ):
        try:
            return torrent_parser(torrent_path, torrent_name, season, file_type)
        except Exception as e:
            logger.warning("Cannot parse {} with error {}", torrent_path, e)

    @staticmethod
    def torrent_name_parser(
        torrent_name: str,
    ):
        try:
            return torrent_name_parser(torrent_name)
        except Exception as e:
            logger.warning("Cannot parse {} with error {}", torrent_name, e)

    @staticmethod
    async def tmdb_parser(title: str, season: int, language: str):
        tmdb_info = await tmdb_parser(title, language)
        if tmdb_info:
            logger.debug("TMDB Matched, official title is {}", tmdb_info.title)
            tmdb_season = tmdb_info.last_season if tmdb_info.last_season else season
            return tmdb_info.title, tmdb_season, tmdb_info.year, tmdb_info.poster_link
        else:
            logger.warning("Cannot match {} in TMDB. Use raw title instead.", title)
            logger.warning("Please change bangumi info manually.")
            return title, season, None, None

    @staticmethod
    async def tmdb_poster_parser(bangumi: Bangumi):
        tmdb_info = await tmdb_parser(
            bangumi.official_title, settings.rss_parser.language
        )
        if tmdb_info:
            logger.debug("TMDB Matched, official title is {}", tmdb_info.title)
            bangumi.poster_link = tmdb_info.poster_link
        else:
            logger.warning(
                "Cannot match {} in TMDB. Use raw title instead.",
                bangumi.official_title,
            )
            logger.warning("Please change bangumi info manually.")

    async def official_title_parser(
        self, bangumi: Bangumi, rss: RSSItem, torrent: Torrent
    ) -> None:
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
        bangumi.official_title = re.sub(r"[/:.\\]", " ", bangumi.official_title)

    @staticmethod
    async def raw_parser(raw: str) -> Bangumi | None:
        language = settings.rss_parser.language
        try:
            if settings.experimental_openai.enable:
                try:
                    async with OpenAIParser(
                        api_key=settings.experimental_openai.api_key,
                        base_url=settings.experimental_openai.base_url,
                        model=settings.experimental_openai.model,
                    ) as gpt:
                        episode = await gpt.parse(raw)
                except Exception as e:
                    logger.warning(
                        "OpenAIParser failed: {}, Falling back to raw_parser.", e
                    )
                    episode = raw_parser(raw)
            else:
                episode = raw_parser(raw)

            if episode is None:
                return None
            titles = {
                "zh": episode.title_zh,
                "en": episode.title_en,
                "jp": episode.title_jp,
            }
            title_raw = episode.title_en or episode.title_zh or episode.title_jp or ""
            official_title = titles.get(language) or title_raw
            _season = episode.season
            logger.debug("RAW:{} >> {}", raw, title_raw)
            return Bangumi(
                official_title=official_title,
                title_raw=title_raw,
                season=_season,
                season_raw=episode.season_raw,
                group_name=episode.group,
                dpi=episode.resolution,
                source=episode.source,
                subtitle=episode.sub,
                eps_collect=False if episode.episode > 1 else True,
                offset=0,
                filter=",".join(settings.rss_parser.filter),
            )
        except Exception as e:
            logger.debug(e)
            logger.warning("Cannot parse {}.", raw)
            return None

    @staticmethod
    async def mikan_parser(homepage: str) -> tuple[str, str]:
        return await mikan_parser(homepage)
