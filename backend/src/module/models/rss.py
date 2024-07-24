from sqlmodel import Field, SQLModel


class RSSItem(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True, alias="id")
    name: str | None = Field(None, alias="name")
    url: str = Field("https://mikanani.me", alias="url")
    aggregate: bool = Field(False, alias="aggregate")
    parser: str = Field("mikan", alias="parser")
    enabled: bool = Field(True, alias="enabled")


class RSSUpdate(SQLModel):
    name: str | None = Field(None, alias="name")
    url: str | None = Field("https://mikanani.me", alias="url")
    aggregate: bool | None = Field(True, alias="aggregate")
    parser: str | None = Field("mikan", alias="parser")
    enabled: bool | None = Field(True, alias="enabled")
