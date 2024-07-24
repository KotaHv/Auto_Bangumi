from dataclasses import dataclass

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class Bangumi(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    official_title: str = Field(
        default="official_title", alias="official_title", title="番剧中文名"
    )
    year: str | None = Field(alias="year", title="番剧年份")
    title_raw: str = Field(default="title_raw", alias="title_raw", title="番剧原名")
    season: int = Field(default=1, alias="season", title="番剧季度")
    season_raw: str | None = Field(alias="season_raw", title="番剧季度原名")
    group_name: str | None = Field(alias="group_name", title="字幕组")
    dpi: str | None = Field(alias="dpi", title="分辨率")
    source: str | None = Field(alias="source", title="来源")
    subtitle: str | None = Field(alias="subtitle", title="字幕")
    eps_collect: bool = Field(default=False, alias="eps_collect", title="是否已收集")
    offset: int = Field(default=0, alias="offset", title="番剧偏移量")
    filter: str = Field(default="720,\\d+-\\d+", alias="filter", title="番剧过滤器")
    rss_link: str = Field(default="", alias="rss_link", title="番剧RSS链接")
    poster_link: str | None = Field(alias="poster_link", title="番剧海报链接")
    added: bool = Field(default=False, alias="added", title="是否已添加")
    rule_name: str | None = Field(alias="rule_name", title="番剧规则名")
    save_path: str | None = Field(alias="save_path", title="番剧保存路径")
    deleted: bool = Field(False, alias="deleted", title="是否已删除")


class BangumiUpdate(SQLModel):
    official_title: str = Field(
        default="official_title", alias="official_title", title="番剧中文名"
    )
    year: str | None = Field(alias="year", title="番剧年份")
    title_raw: str = Field(default="title_raw", alias="title_raw", title="番剧原名")
    season: int = Field(default=1, alias="season", title="番剧季度")
    season_raw: str | None = Field(alias="season_raw", title="番剧季度原名")
    group_name: str | None = Field(alias="group_name", title="字幕组")
    dpi: str | None = Field(alias="dpi", title="分辨率")
    source: str | None = Field(alias="source", title="来源")
    subtitle: str | None = Field(alias="subtitle", title="字幕")
    eps_collect: bool = Field(default=False, alias="eps_collect", title="是否已收集")
    offset: int = Field(default=0, alias="offset", title="番剧偏移量")
    filter: str = Field(default="720,\\d+-\\d+", alias="filter", title="番剧过滤器")
    rss_link: str = Field(default="", alias="rss_link", title="番剧RSS链接")
    poster_link: str | None = Field(alias="poster_link", title="番剧海报链接")
    added: bool = Field(default=False, alias="added", title="是否已添加")
    rule_name: str | None = Field(alias="rule_name", title="番剧规则名")
    save_path: str | None = Field(alias="save_path", title="番剧保存路径")
    deleted: bool = Field(False, alias="deleted", title="是否已删除")


class Notification(BaseModel):
    official_title: str = Field(..., alias="official_title", title="番剧名")
    season: int = Field(..., alias="season", title="番剧季度")
    episode: int = Field(..., alias="episode", title="番剧集数")
    poster_path: str | None = Field(None, alias="poster_path", title="番剧海报路径")


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
