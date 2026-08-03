from dataclasses import dataclass
from typing import Annotated

from pydantic import BaseModel, Field
from sqlmodel import Field as SQLField
from sqlmodel import SQLModel


class Bangumi(SQLModel, table=True):
    id: Annotated[int | None, SQLField(primary_key=True)] = None
    official_title: Annotated[str, SQLField(title="番剧中文名")] = ""
    year: Annotated[str | None, SQLField(title="番剧年份")] = None
    title_raw: Annotated[str, SQLField(title="番剧原名")] = ""
    season: Annotated[int, SQLField(title="番剧季度")] = 1
    season_raw: Annotated[str | None, SQLField(title="番剧季度原名")] = None
    group_name: Annotated[str | None, SQLField(title="字幕组")] = None
    dpi: Annotated[str | None, SQLField(title="分辨率")] = None
    source: Annotated[str | None, SQLField(title="来源")] = None
    subtitle: Annotated[str | None, SQLField(title="字幕")] = None
    eps_collect: Annotated[bool, SQLField(title="是否已收集")] = False
    offset: Annotated[int, SQLField(title="番剧偏移量")] = 0
    filter: Annotated[str, SQLField(title="番剧过滤器")] = "720,\\d+-\\d+"
    rss_link: Annotated[str, SQLField(title="番剧RSS链接")] = ""
    poster_link: Annotated[str | None, SQLField(title="番剧海报链接")] = None
    added: Annotated[bool, SQLField(title="是否已添加")] = False
    rule_name: Annotated[str | None, SQLField(title="番剧规则名")] = None
    save_path: Annotated[str | None, SQLField(title="番剧保存路径")] = None
    deleted: Annotated[bool, SQLField(title="是否已删除")] = False


class BangumiUpdate(SQLModel):
    official_title: Annotated[str, SQLField(title="番剧中文名")] = "official_title"
    year: Annotated[str | None, SQLField(title="番剧年份")] = None
    title_raw: Annotated[str, SQLField(title="番剧原名")] = ""
    season: Annotated[int, SQLField(title="番剧季度")] = 1
    season_raw: Annotated[str | None, SQLField(title="番剧季度原名")] = None
    group_name: Annotated[str | None, SQLField(title="字幕组")] = None
    dpi: Annotated[str | None, SQLField(title="分辨率")] = None
    source: Annotated[str | None, SQLField(title="来源")] = None
    subtitle: Annotated[str | None, SQLField(title="字幕")] = None
    eps_collect: Annotated[bool, SQLField(title="是否已收集")] = False
    offset: Annotated[int, SQLField(title="番剧偏移量")] = 0
    filter: Annotated[str, SQLField(title="番剧过滤器")] = "720,\\d+-\\d+"
    rss_link: Annotated[str, SQLField(title="番剧RSS链接")] = ""
    poster_link: Annotated[str | None, SQLField(title="番剧海报链接")] = None
    added: Annotated[bool, SQLField(title="是否已添加")] = False
    rule_name: Annotated[str | None, SQLField(title="番剧规则名")] = None
    save_path: Annotated[str | None, SQLField(title="番剧保存路径")] = None
    deleted: Annotated[bool, SQLField(title="是否已删除")] = False


class Notification(BaseModel):
    official_title: Annotated[str, Field(title="番剧名")]
    season: Annotated[int, Field(title="番剧季度")]
    episode: Annotated[int | float, Field(title="番剧集数")]
    poster_path: Annotated[str | None, Field(title="番剧海报路径")] = None


class Episode(BaseModel):
    title_en: str | None
    title_zh: str | None
    title_jp: str | None
    season: int
    season_raw: str
    episode: int | float
    sub: str | None
    group: str
    resolution: str | None
    source: str | None


@dataclass
class SeasonInfo(dict):
    official_title: str
    title_raw: str
    season: int
    season_raw: str
    group: str
    filter: list | None
    offset: int | None
    dpi: str
    source: str
    subtitle: str
    added: bool
    eps_collect: bool
