import asyncio
import logging
from collections.abc import Iterator
from pathlib import Path

import pytest
from loguru import logger
from sqlalchemy import inspect
from sqlmodel import Session, SQLModel, col, select

from module.database.log import LogDatabase
from module.logger import LoggerManager, skip_database_log
from module.models.log import LOG_METADATA, LogEntry


@pytest.fixture
def manager_and_database(
    isolated_log_manager: LoggerManager,
) -> Iterator[tuple[LoggerManager, LogDatabase]]:
    isolated_log_manager.setup(debug_enabled=False)
    yield isolated_log_manager, isolated_log_manager.database


def test_log_schema_is_independent_from_business_metadata(tmp_path: Path):
    database = LogDatabase(path=tmp_path / "logs.db")

    with database.engine.connect() as connection:
        assert inspect(connection).get_table_names() == [
            "alembic_version",
            "log_entries",
        ]
        assert {
            column["name"] for column in inspect(connection).get_columns("log_entries")
        } == {
            "id",
            "timestamp",
            "level_no",
            "message",
            "module",
            "function",
            "line",
            "exception",
        }
        assert {
            index["name"] for index in inspect(connection).get_indexes("log_entries")
        } == {"ix_log_entries_level_no_id", "ix_log_entries_timestamp"}

    assert "log_entries" not in SQLModel.metadata.tables
    assert "log_entries" in LOG_METADATA.tables
    database.dispose()


def test_durable_database_is_created_on_init(tmp_path: Path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.chdir(tmp_path)
    manager = LoggerManager()
    try:
        assert (tmp_path / "data" / "logs.db").exists()
    finally:
        asyncio.run(manager.shutdown())


def test_durable_database_follows_cwd(tmp_path: Path, monkeypatch):
    first = tmp_path / "first"
    second = tmp_path / "second"
    first.mkdir()
    second.mkdir()

    monkeypatch.chdir(first)
    manager = LoggerManager()
    manager.setup(debug_enabled=False)
    asyncio.run(manager.shutdown())

    monkeypatch.chdir(second)
    manager = LoggerManager()
    manager.setup(debug_enabled=False)
    try:
        assert (second / "data" / "logs.db").exists()
    finally:
        asyncio.run(manager.shutdown())


def test_history_survives_restart(tmp_path: Path):
    database_path = tmp_path / "logs.db"

    first = LoggerManager(database=LogDatabase(path=database_path))
    first.setup(debug_enabled=False)
    try:
        logger.info("persisted across restart")
        logger.complete()
    finally:
        asyncio.run(first.shutdown())

    second = LoggerManager(database=LogDatabase(path=database_path))
    second.setup(debug_enabled=False)
    try:
        with Session(second.database.engine) as session:
            entries = session.exec(select(LogEntry).order_by(col(LogEntry.id))).all()

        assert [entry.message for entry in entries] == ["persisted across restart"]
    finally:
        asyncio.run(second.shutdown())


def test_durable_sink_persists_formatted_record_and_traceback(
    manager_and_database,
):
    manager, database = manager_and_database

    logger.info("durable test started")
    try:
        raise ZeroDivisionError("test error")
    except ZeroDivisionError:
        logger.exception("calculation failed")
    logger.complete()

    with Session(database.engine) as session:
        entries = session.exec(select(LogEntry).order_by(col(LogEntry.id))).all()

    assert [entry.message for entry in entries] == [
        "durable test started",
        "calculation failed",
    ]
    assert entries[1].exception is not None
    assert "ZeroDivisionError" in entries[1].exception
    assert "test_structured_log.py" in entries[1].exception
    assert entries[1].timestamp > 0


def test_durable_sink_recovers_after_write_failure(
    manager_and_database, monkeypatch, capsys
):
    manager, database = manager_and_database

    original_add = database.add
    attempts = 0

    def flaky_add(entry):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("simulated log database failure")
        original_add(entry)

    monkeypatch.setattr(database, "add", flaky_add)
    logger.info("write failure")
    logger.complete()
    logger.info("write recovery")
    logger.complete()

    with Session(database.engine) as session:
        entries = session.exec(select(LogEntry).order_by(col(LogEntry.id))).all()

    assert [entry.message for entry in entries] == ["write recovery"]
    assert (
        "Structured log write failed: simulated log database failure"
        in capsys.readouterr().err
    )


def test_config_reconfiguration_rebuilds_sinks_once(manager_and_database, monkeypatch):
    manager, database = manager_and_database
    migration_calls = 0
    real_migrate = database._migrate

    def counting_migrate():
        nonlocal migration_calls
        migration_calls += 1
        real_migrate()

    monkeypatch.setattr(database, "_migrate", counting_migrate)
    logger.info("before config reconfiguration")
    manager.setup(debug_enabled=True)
    logger.info("after config reconfiguration")
    logger.complete()

    assert migration_calls == 0

    with Session(database.engine) as session:
        entries = session.exec(select(LogEntry).order_by(col(LogEntry.id))).all()

    assert [entry.message for entry in entries] == [
        "before config reconfiguration",
        "after config reconfiguration",
    ]


def test_debug_enabled_records_debug(manager_and_database):
    manager, database = manager_and_database
    manager.setup(debug_enabled=True)

    logger.patch(lambda record: record.update(name="module.test")).debug(
        "debug visible"
    )
    logger.complete()

    with Session(database.engine) as session:
        entries = session.exec(select(LogEntry).order_by(col(LogEntry.id))).all()

    assert [entry.level_no for entry in entries] == [logging.DEBUG]


def test_debug_disabled_excludes_debug(manager_and_database):
    manager, database = manager_and_database

    logger.patch(lambda record: record.update(name="module.test")).debug("debug hidden")
    logger.info("info visible")
    logger.complete()

    with Session(database.engine) as session:
        entries = session.exec(select(LogEntry).order_by(col(LogEntry.id))).all()

    assert [entry.message for entry in entries] == ["info visible"]


def test_skip_database_excludes_record_from_sqlite(manager_and_database):
    manager, database = manager_and_database

    skip_database_log().info("banner line")
    logger.info("normal line")
    logger.complete()

    with Session(database.engine) as session:
        entries = session.exec(select(LogEntry).order_by(col(LogEntry.id))).all()

    assert [entry.message for entry in entries] == ["normal line"]
