import logging
import re
from pathlib import Path

from module.models import EpisodeFile, SubtitleFile

logger = logging.getLogger(__name__)

PLATFORM = "Unix"

RULES = [
    r"(.*) - (\d{1,4}\.\d{1,2}(?!\d|p)|\d{1,4}(?!\d|p))(?:v\d{1,2})?(?: )?(?:END)?(.*)",
    r"(.*)[\[\ E](\d{1,4}\.\d{1,2}|\d{1,4})(?:v\d{1,2})?(?: )?(?:END)?[\]\ ](.*)",
    r"(.*)\[(?:第)?(\d*\.*\d*)[话集話](?:END)?\](.*)",
    r"(.*)第?(\d*\.*\d*)[话話集](?:END)?(.*)",
    r"(.*)(?:S\d{2})?EP?(\d+)(.*)",
]

compiled_rules = [re.compile(rule, flags=re.I) for rule in RULES]

SUBTITLE_LANG = {
    "zh-tw": ["tc", "cht", "繁", "zh-tw"],
    "zh": ["sc", "chs", "简", "zh"],
}


def get_path_basename(torrent_path: str) -> str:
    """
    Returns the basename of a path string.

    :param torrent_path: A string representing a path to a file.
    :type torrent_path: str
    :return: A string representing the basename of the given path.
    :rtype: str
    """
    return Path(torrent_path).name


group_split_pattern = re.compile(r"[\[\]()【】（）]")
group_match_pattern = re.compile(r"\d+")


def get_group(group_and_title) -> tuple[str | None, str]:
    n = group_split_pattern.split(group_and_title)
    while "" in n:
        n.remove("")
    if len(n) > 1:
        if group_match_pattern.match(n[1]):
            return None, group_and_title
        return n[0], n[1]
    else:
        return None, n[0]


season_remove_pattern = re.compile(r"([Ss]|Season )\d{1,3}")
season_search_pattern = re.compile(r"([Ss]|Season )(\d{1,3})", re.I)


def get_season_and_title(season_and_title) -> tuple[str, int]:
    title = season_remove_pattern.sub("", season_and_title).strip()
    try:
        season = season_search_pattern.search(season_and_title).group(2)
    except AttributeError:
        season = 1
    return title, int(season)


def get_subtitle_lang(subtitle_name: str) -> str:
    for key, value in SUBTITLE_LANG.items():
        for v in value:
            if v in subtitle_name.lower():
                return key


def torrent_parser(
    torrent_path: str,
    torrent_name: str | None = None,
    season: int | None = None,
    file_type: str = "media",
) -> EpisodeFile | SubtitleFile:
    media_path = get_path_basename(torrent_path)
    match_names = [torrent_name, media_path]
    if torrent_name is None:
        match_names = match_names[1:]
    for match_name in match_names:
        for compiled_rule in compiled_rules:
            match_obj = compiled_rule.match(match_name)
            if match_obj:
                group, title = get_group(match_obj.group(1))
                if not season:
                    title, season = get_season_and_title(title)
                else:
                    title, _ = get_season_and_title(title)
                episode = match_obj.group(2)
                suffix = Path(torrent_path).suffix
                if file_type == "media":
                    return EpisodeFile(
                        media_path=torrent_path,
                        group=group,
                        title=title,
                        season=season,
                        episode=episode,
                        suffix=suffix,
                    )
                elif file_type == "subtitle":
                    language = get_subtitle_lang(media_path)
                    return SubtitleFile(
                        media_path=torrent_path,
                        group=group,
                        title=title,
                        season=season,
                        language=language,
                        episode=episode,
                        suffix=suffix,
                    )
