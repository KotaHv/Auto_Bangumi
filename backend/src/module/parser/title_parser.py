from loguru import logger

from module.conf import settings
from module.models import Bangumi
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
            title_raw = episode.title_en or episode.title_zh or ""
            official_title = title_raw
            for key in (language, "zh", "en", "jp"):
                candidate = titles[key]
                if candidate:
                    official_title = candidate
                    break
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
