from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class Torrent(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True, alias="id")
    bangumi_id: int | None = Field(None, alias="refer_id", foreign_key="bangumi.id")
    rss_id: int | None = Field(None, alias="rss_id", foreign_key="rssitem.id")
    name: str = Field("", alias="name")
    url: str = Field("https://example.com/torrent", alias="url")
    homepage: str | None = Field(None, alias="homepage")
    downloaded: bool = Field(False, alias="downloaded")
    hash: str | None = Field(None, alias="hash")


class TorrentUpdate(SQLModel):
    downloaded: bool = Field(False, alias="downloaded")


class EpisodeFile(BaseModel):
    media_path: str = Field(...)
    group: str | None = Field(None)
    title: str = Field(...)
    season: int = Field(...)
    episode: int | float = Field(None)
    episode_revision: int = Field(1)
    suffix: str = Field(..., regex=r"\.(mkv|mp4|MKV|MP4)$")


class SubtitleFile(BaseModel):
    media_path: str = Field(...)
    group: str | None = Field(None)
    title: str = Field(...)
    season: int = Field(...)
    episode: int | float = Field(None)
    episode_revision: int = Field(1)
    language: str = Field(..., regex=r"(zh|zh-tw)")
    suffix: str = Field(..., regex=r"\.(ass|srt|ASS|SRT)$")


class TorrentInfo(BaseModel):
    title: str = Field(...)
    episode: int | float = Field(...)
    episode_revision: int = Field(...)
