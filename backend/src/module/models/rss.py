from typing import Annotated

from sqlmodel import Field, SQLModel


class RSSItem(SQLModel, table=True):
    id: Annotated[int | None, Field(primary_key=True)] = None
    name: str | None = None
    url: str = ""
    aggregate: bool = False
    parser: str = "mikan"
    enabled: bool = True


class RSSUpdate(SQLModel):
    name: str | None = None
    url: str | None = ""
    aggregate: bool | None = True
    parser: str | None = "mikan"
    enabled: bool | None = True
