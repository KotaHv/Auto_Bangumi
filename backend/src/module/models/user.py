from typing import Annotated

from sqlmodel import Field as SQLField
from sqlmodel import SQLModel


class User(SQLModel, table=True):
    id: Annotated[int | None, SQLField(primary_key=True)] = None
    username: Annotated[
        str, SQLField(min_length=4, max_length=20, regex=r"^[a-zA-Z0-9_| None+$")
    ] = "admin"
    password: Annotated[str, SQLField(min_length=8)] = "adminadmin"


class UserUpdate(SQLModel):
    username: Annotated[
        str | None, SQLField(min_length=4, max_length=20, regex=r"^[a-zA-Z0-9_| None+$")
    ] = None
    password: Annotated[str | None, SQLField(min_length=8)] = None
