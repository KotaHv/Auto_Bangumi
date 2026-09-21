from typing import Annotated, ClassVar

from pydantic import BaseModel, Field
from sqlalchemy import BigInteger, Column, Index, MetaData, Text
from sqlmodel import Field as SQLField
from sqlmodel import SQLModel

LOG_METADATA = MetaData()


class LogEntry(SQLModel, table=True):
    """A structured log record stored in the dedicated log database."""

    __tablename__: ClassVar[str] = "log_entries"
    metadata = LOG_METADATA
    __table_args__ = (
        Index("ix_log_entries_level_no_id", "level_no", "id"),
        Index("ix_log_entries_timestamp", "timestamp"),
    )

    id: int | None = SQLField(default=None, primary_key=True)
    timestamp: int = SQLField(
        description="UTC Unix timestamp in microseconds",
        sa_column=Column(BigInteger, nullable=False),
    )
    level_no: int
    message: str = SQLField(sa_column=Column(Text, nullable=False))
    module: str | None = None
    function: str
    line: int
    exception: str | None = SQLField(
        default=None,
        sa_column=Column(Text, nullable=True),
    )


class LogRecord(BaseModel):
    id: int
    timestamp: Annotated[str, Field(description="ISO 8601 with timezone")]
    level: str
    message: str
    module: str | None
    function: str
    line: int
    exception: str | None


class LogPage(BaseModel):
    items: list[LogRecord]
    next_cursor: int | None
    has_more: bool
