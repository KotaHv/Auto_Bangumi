from sqlmodel import Field, SQLModel


class RSSItem(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
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
