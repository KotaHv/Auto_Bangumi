import re
from pathlib import Path

from loguru import logger

from module.models import EpisodeFile, SubtitleFile, TorrentInfo
from module.utils.text import pre_process

PLATFORM = "Unix"

RULES = [
    r"(.*) - (\d{1,4}(?:\.\d{1,2})?(?!\d|p))(?:v\d{1,2})?(?: )?(?:END)?(.*)",
    r"(.*)[\[\ E](\d{1,4}(?:\.\d{1,2})?(?!\d|p))(?:v\d{1,2})?(?: )?(?:END)?[\]\ ](.*)",
    r"(.*)\[(?:第)?(\d{1,4}(?:\.\d{1,2})?(?!\d|p))[话集話](?:END)?\](.*)",
    r"(.*)第?(\d{1,4}(?:\.\d{1,2})?(?!\d|p))[话話集](?:END)?(.*)",
    r"(.*)(?:S\d{2})?EP?(\d{1,4}(?:\.\d{1,2})?(?!\d|p))(.*)",
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


episode_revision_pattern = re.compile(r"\d{1,4}v(\d{1,2})|\[v(\d{1,2})\]", re.I)


def get_episode_revision(name: str) -> int:
    match_result = episode_revision_pattern.search(name)
    if match_result:
        for group in match_result.groups():
            if group:
                return int(group)
    return 1


def torrent_parser(
    torrent_path: str,
    torrent_name: str | None = None,
    season: int | None = None,
    file_type: str = "media",
) -> EpisodeFile | SubtitleFile:
    media_path = get_path_basename(torrent_path)
    match_names = filter(None, [torrent_name, media_path])
    for match_name in match_names:
        match_name = pre_process(match_name)
        for compiled_rule in compiled_rules:
            match_obj = compiled_rule.match(match_name)
            if match_obj:
                episode_revision = get_episode_revision(match_name)
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
                        episode_revision=episode_revision,
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
                        episode_revision=episode_revision,
                        suffix=suffix,
                    )


def torrent_name_parser(torrent_name: str) -> TorrentInfo:
    torrent_name = pre_process(torrent_name)
    for compiled_rule in compiled_rules:
        match_obj = compiled_rule.match(torrent_name)
        if match_obj:
            episode_revision = get_episode_revision(torrent_name)
            title = match_obj.group(1)
            episode = match_obj.group(2)
            return TorrentInfo(
                title=title,
                episode=episode,
                episode_revision=episode_revision,
            )
