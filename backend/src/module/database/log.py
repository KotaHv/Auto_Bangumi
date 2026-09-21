from pathlib import Path
from typing import Any

from sqlalchemy import Engine, create_engine, event
from sqlmodel import Session

from module.conf import LOG_DATABASE_PATH
from module.models.log import LogEntry

from .alembic import upgrade_schema


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
        with Session(self.engine) as session:
            session.add(entry)
            session.commit()

    def dispose(self) -> None:
        self.engine.dispose()
