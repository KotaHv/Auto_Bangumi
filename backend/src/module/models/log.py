from typing import ClassVar

from sqlalchemy import BigInteger, Column, Index, MetaData, Text
from sqlmodel import Field, SQLModel

LOG_METADATA = MetaData()


class LogEntry(SQLModel, table=True):
    """A structured log record stored in the dedicated log database."""

    __tablename__: ClassVar[str] = "log_entries"
    metadata = LOG_METADATA
    __table_args__ = (
        Index("ix_log_entries_level_no_id", "level_no", "id"),
        Index("ix_log_entries_timestamp", "timestamp"),
    )

    id: int | None = Field(default=None, primary_key=True)
    timestamp: int = Field(
        description="UTC Unix timestamp in microseconds",
        sa_column=Column(BigInteger, nullable=False),
    )
    level_no: int
    message: str = Field(sa_column=Column(Text, nullable=False))
    module: str | None = None
    function: str
    line: int
    exception: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
