from datetime import datetime
from pathlib import Path
from typing import Any, cast

from sqlalchemy import Engine, create_engine, delete, event
from sqlmodel import Session, col, select

from module.conf import LOG_DATABASE_PATH
from module.exceptions import (
    InvalidLogLevel,
    InvalidLogLimit,
    InvalidLogTimeRange,
)
from module.models.log import LogEntry, LogPage, LogRecord
from module.utils.log_level import LEVEL_NAMES, LEVEL_NUMBERS
from module.utils.log_time import from_microseconds, to_microseconds

from .alembic import upgrade_schema

DEFAULT_LIMIT = 100
MAX_LIMIT = 500


class LogDatabase:
    def __init__(self, path: Path | str = LOG_DATABASE_PATH) -> None:
        self.engine = self._create_engine(path)
        self._migrate()

    @staticmethod
    def _configure_sqlite(dbapi_connection: Any, _connection_record: Any) -> None:
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=5000")
        finally:
            cursor.close()

    @classmethod
    def _create_engine(cls, path: Path | str) -> Engine:
        database_path = Path(path)
        database_path.parent.mkdir(parents=True, exist_ok=True)
        engine = create_engine(
            f"sqlite:///{database_path}",
            connect_args={"check_same_thread": False, "timeout": 5.0},
        )
        event.listen(engine, "connect", cls._configure_sqlite)
        return engine

    def _migrate(self) -> None:
        with self.engine.begin() as connection:
            upgrade_schema(connection, migration_dir="log_migrations")

    def add(self, entry: LogEntry) -> None:
        with Session(self.engine, expire_on_commit=False) as session:
            session.add(entry)
            session.commit()

    def query_logs(
        self,
        *,
        level: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        module: str | None = None,
        query: str | None = None,
        limit: int = DEFAULT_LIMIT,
        before_id: int | None = None,
    ) -> LogPage:
        _validate_limit(limit)
        statement = _filtered_statement(
            level=level, start=start, end=end, module=module, query=query
        )
        if before_id is not None:
            statement = statement.where(col(LogEntry.id) < before_id)
        statement = statement.order_by(col(LogEntry.id).desc()).limit(limit + 1)

        with Session(self.engine) as session:
            rows = list(session.exec(statement).all())
            items = [_to_record(entry) for entry in rows[:limit]]

        has_more = len(rows) > limit
        next_cursor = items[-1].id if has_more else None
        return LogPage(items=items, next_cursor=next_cursor, has_more=has_more)

    def query_latest_logs(
        self,
        *,
        level: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        module: str | None = None,
        query: str | None = None,
        limit: int = DEFAULT_LIMIT,
    ) -> list[LogRecord]:
        _validate_limit(limit)
        statement = _filtered_statement(
            level=level, start=start, end=end, module=module, query=query
        )
        statement = statement.order_by(col(LogEntry.id).desc()).limit(limit)

        with Session(self.engine) as session:
            rows = list(session.exec(statement).all())
            return [_to_record(entry) for entry in reversed(rows)]

    def query_logs_after(
        self,
        *,
        last_id: int,
        level: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        module: str | None = None,
        query: str | None = None,
        limit: int = MAX_LIMIT,
    ) -> LogPage:
        _validate_limit(limit)
        statement = _filtered_statement(
            level=level, start=start, end=end, module=module, query=query
        )
        statement = (
            statement.where(col(LogEntry.id) > last_id)
            .order_by(col(LogEntry.id).asc())
            .limit(limit + 1)
        )

        with Session(self.engine) as session:
            rows = list(session.exec(statement).all())
            items = [_to_record(entry) for entry in rows[:limit]]

        has_more = len(rows) > limit
        next_cursor = items[-1].id if has_more else None
        return LogPage(items=items, next_cursor=next_cursor, has_more=has_more)

    def clear(self) -> int:
        with Session(self.engine) as session:
            result = session.exec(delete(LogEntry))
            session.commit()
            return result.rowcount

    def dispose(self) -> None:
        self.engine.dispose()


def _validate_limit(limit: int) -> None:
    if not 1 <= limit <= MAX_LIMIT:
        raise InvalidLogLimit(limit, MAX_LIMIT)


def _filtered_statement(
    *,
    level: str | None,
    start: datetime | None,
    end: datetime | None,
    module: str | None,
    query: str | None,
):
    if level is not None and level not in LEVEL_NUMBERS:
        raise InvalidLogLevel(level)

    start_us = to_microseconds(start) if start is not None else None
    end_us = to_microseconds(end) if end is not None else None
    if start_us is not None and end_us is not None and start_us > end_us:
        raise InvalidLogTimeRange(
            from_microseconds(start_us), from_microseconds(end_us)
        )

    statement = select(LogEntry)
    if level is not None:
        statement = statement.where(col(LogEntry.level_no) == LEVEL_NUMBERS[level])
    if start_us is not None:
        statement = statement.where(col(LogEntry.timestamp) >= start_us)
    if end_us is not None:
        statement = statement.where(col(LogEntry.timestamp) < end_us)
    if module:
        statement = statement.where(
            col(LogEntry.module).contains(module, autoescape=True)
        )
    if query:
        statement = statement.where(
            col(LogEntry.message).contains(query, autoescape=True)
        )
    return statement


def _to_record(entry: LogEntry) -> LogRecord:
    return LogRecord(
        id=cast(int, entry.id),
        timestamp=from_microseconds(entry.timestamp).isoformat(),
        level=LEVEL_NAMES[entry.level_no],
        message=entry.message,
        module=entry.module,
        function=entry.function,
        line=entry.line,
        exception=entry.exception,
    )
