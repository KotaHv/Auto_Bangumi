from typing import Annotated, Literal

from pydantic import AnyHttpUrl, BaseModel, Field, TypeAdapter, field_validator
from sqlmodel import Field as SQLField
from sqlmodel import SQLModel

from .bangumi import BangumiData


class RSSItem(SQLModel, table=True):
    id: Annotated[int | None, SQLField(primary_key=True)] = None
    name: str | None = None
    url: str
    aggregate: bool = False
    parser: str = "mikan"
    enabled: bool = True

    @field_validator("url")
    @classmethod
    def validate_http_url(cls, value: str) -> str:
        value = value.strip()
        return str(TypeAdapter(AnyHttpUrl).validate_python(value))


class RSSUpdate(SQLModel):
    name: str | None = None
    url: str = ""
    aggregate: bool = True
    parser: str = "mikan"
    enabled: bool = True


class RSSAnalysisOption(BaseModel):
    type: Literal["exact_match", "candidate", "create"]
    bangumi: BangumiData


class RSSAnalysisResult(BaseModel):
    options: Annotated[list[RSSAnalysisOption], Field(min_length=1)]
