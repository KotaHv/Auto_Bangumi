from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class Torrent(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    bangumi_id: int | None = Field(None, foreign_key="bangumi.id")
    rss_id: int | None = None
    name: str = ""
    url: str = ""
    homepage: str | None = None
    downloaded: bool = False
    hash: str | None = None


class TorrentUpdate(SQLModel):
    downloaded: bool = False


class EpisodeFile(BaseModel):
    media_path: str
    group: str | None = None
    title: str
    season: int
    episode: int | float
    episode_revision: int = 1
    suffix: str = Field(..., regex=r"\.(mkv|mp4|MKV|MP4)$")


class SubtitleFile(BaseModel):
    media_path: str
    group: str | None = None
    title: str
    season: int
    episode: int | float
    episode_revision: int = 1
    language: str = Field(..., regex=r"(zh|zh-tw)")
    suffix: str = Field(..., regex=r"\.(ass|srt|ASS|SRT)$")


class TorrentInfo(BaseModel):
    title: str
    episode: int | float
    episode_revision: int
