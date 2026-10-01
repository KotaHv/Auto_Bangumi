from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from module.conf import DATA_PATH


def _configure_sqlite(dbapi_connection: Any, _connection_record: Any) -> None:
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
    finally:
        cursor.close()


def _create_engine(database_url: str) -> AsyncEngine:
    async_engine = create_async_engine(database_url)
    event.listen(async_engine.sync_engine, "connect", _configure_sqlite)
    return async_engine


engine = _create_engine(DATA_PATH)
