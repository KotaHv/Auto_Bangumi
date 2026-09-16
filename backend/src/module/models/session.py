from typing import Annotated, ClassVar

from sqlmodel import Field as SQLField
from sqlmodel import SQLModel


class AuthSession(SQLModel, table=True):
    __tablename__: ClassVar[str] = "session"

    id: Annotated[int | None, SQLField(primary_key=True)] = None
    token_hash: Annotated[str, SQLField(unique=True, max_length=64)]
    created_at: int
    expires_at: int
