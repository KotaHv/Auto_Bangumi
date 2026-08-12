from typing import Annotated

from pydantic import BaseModel, Field
from sqlmodel import Field as SQLField
from sqlmodel import SQLModel


class Torrent(SQLModel, table=True):
    id: Annotated[int | None, SQLField(primary_key=True)] = None
    bangumi_id: Annotated[int | None, SQLField(foreign_key="bangumi.id")] = None
    rss_id: int | None = None
    name: str = ""
    url: str = ""
    homepage: str | None = None
    downloaded: bool = False
    hash: str | None = None


class EpisodeFile(BaseModel):
    media_path: str
    group: str | None = None
    title: str
    season: int
    episode: int | float
    episode_revision: int = 1
    suffix: Annotated[str, Field(pattern=r"\.(mkv|mp4|MKV|MP4)$")]


class SubtitleFile(BaseModel):
    media_path: str
    group: str | None = None
    title: str
    season: int
    episode: int | float
    episode_revision: int = 1
    language: Annotated[str, Field(pattern=r"(zh|zh-tw)")]
    suffix: Annotated[str, Field(pattern=r"\.(ass|srt|ASS|SRT)$")]


class TorrentInfo(BaseModel):
    title: str
    episode: int | float
    episode_revision: int
