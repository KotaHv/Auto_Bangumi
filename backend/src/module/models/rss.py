from typing import Annotated, Literal

from pydantic import AnyHttpUrl, BaseModel, Field, TypeAdapter, field_validator
from sqlmodel import Field as SQLField
from sqlmodel import Relationship, SQLModel

from .bangumi import Bangumi, BangumiData, BangumiRSS

_URL_ADAPTER = TypeAdapter(AnyHttpUrl)


def _normalize_http_url(value: str) -> str:
    return str(_URL_ADAPTER.validate_python(value.strip()))


class RSSItem(SQLModel, table=True):
    id: Annotated[int | None, SQLField(primary_key=True)] = None
    name: str | None = None
    url: Annotated[str, SQLField(unique=True)]
    aggregate: bool = False
    parser: str = "mikan"
    enabled: bool = True
    bangumis: list[Bangumi] = Relationship(
        back_populates="rss_items", link_model=BangumiRSS
    )

    @field_validator("url")
    @classmethod
    def validate_http_url(cls, value: str) -> str:
        return _normalize_http_url(value)


class RSSUpdate(SQLModel):
    name: str | None = None
    url: str = ""
    aggregate: bool = True
    parser: str = "mikan"
    enabled: bool = True

    @field_validator("url")
    @classmethod
    def validate_http_url(cls, value: str) -> str:
        return _normalize_http_url(value)


class RSSAnalysisOption(BaseModel):
    type: Literal["exact_match", "candidate", "create"]
    bangumi: BangumiData


class RSSAnalysisResult(BaseModel):
    options: Annotated[list[RSSAnalysisOption], Field(min_length=1)]
