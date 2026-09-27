from typing import Annotated

from pydantic import StringConstraints
from sqlmodel import Field as SQLField
from sqlmodel import SQLModel

Username = Annotated[
    str,
    StringConstraints(min_length=4, max_length=20, pattern=r"^[A-Za-z0-9_]+$"),
]


class User(SQLModel, table=True):
    id: Annotated[int | None, SQLField(primary_key=True)] = None
    username: Username = "admin"
    password: Annotated[str, SQLField(min_length=8)] = "adminadmin"


class UserUpdate(SQLModel):
    username: Username | None = None
    password: Annotated[str | None, SQLField(min_length=8)] = None
