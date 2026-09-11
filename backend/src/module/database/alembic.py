from pathlib import Path

from alembic.config import Config
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncEngine

from alembic import command

from .engine import engine


def _project_config_path() -> Path:
    for parent in Path(__file__).resolve().parents:
        config_path = parent / "pyproject.toml"
        if config_path.is_file():
            return config_path
    raise RuntimeError("Alembic project configuration could not be located")


def _columns(connection, table_name: str) -> set[str]:
    return {column["name"] for column in inspect(connection).get_columns(table_name)}


def _has_primary_key(connection, table_name: str) -> bool:
    return inspect(connection).get_pk_constraint(table_name).get("constrained_columns") == ["id"]


def _has_foreign_key(connection, table_name: str, column: str, target: str) -> bool:
    return any(
        foreign_key["constrained_columns"] == [column]
        and foreign_key["referred_table"] == target
        and foreign_key["referred_columns"] == ["id"]
        for foreign_key in inspect(connection).get_foreign_keys(table_name)
    )


_BANGUMI_COLUMNS = {
    "id",
    "official_title",
    "year",
    "title_raw",
    "season",
    "season_raw",
    "group_name",
    "dpi",
    "source",
    "subtitle",
    "eps_collect",
    "offset",
    "filter",
    "rss_link",
    "poster_link",
    "added",
    "rule_name",
    "save_path",
    "deleted",
}
_RSS_COLUMNS = {"id", "name", "url", "aggregate", "parser", "enabled"}
_USER_COLUMNS = {"id", "username", "password"}
_TORRENT_BASE_COLUMNS = {
    "id",
    "bangumi_id",
    "rss_id",
    "name",
    "url",
    "homepage",
    "downloaded",
}


def _is_supported_legacy_schema(connection) -> bool:
    tables = set(inspect(connection).get_table_names()) - {"alembic_version"}
    if tables != {"bangumi", "rssitem", "torrent", "user"}:
        return False
    if not all(
        _has_primary_key(connection, table)
        for table in ("bangumi", "rssitem", "torrent", "user")
    ):
        return False
    if _columns(connection, "bangumi") != _BANGUMI_COLUMNS:
        return False
    if _columns(connection, "rssitem") != _RSS_COLUMNS:
        return False
    if _columns(connection, "user") != _USER_COLUMNS:
        return False

    torrent_columns = _columns(connection, "torrent")
    if torrent_columns not in (
        _TORRENT_BASE_COLUMNS,
        _TORRENT_BASE_COLUMNS | {"hash"},
    ):
        return False
    if not _has_foreign_key(connection, "torrent", "bangumi_id", "bangumi"):
        return False

    has_hash = "hash" in torrent_columns
    has_rss_foreign_key = _has_foreign_key(
        connection, "torrent", "rss_id", "rssitem"
    )
    return has_hash or has_rss_foreign_key


def _detect_legacy_revision(connection) -> str:
    if not _is_supported_legacy_schema(connection):
        raise RuntimeError("Unsupported or partial AutoBangumi database schema")

    torrent_columns = _columns(connection, "torrent")
    rss_foreign_key = _has_foreign_key(connection, "torrent", "rss_id", "rssitem")
    if "hash" not in torrent_columns:
        return "0001_baseline"
    if rss_foreign_key:
        return "0002_add_torrent_hash"
    return "0003_remove_rss_foreign_key"


def _has_alembic_revision(connection) -> bool:
    if "alembic_version" not in inspect(connection).get_table_names():
        return False
    return connection.execute(text("SELECT 1 FROM alembic_version LIMIT 1")).first() is not None


def _run_alembic_upgrade(connection, alembic_config: Config):
    alembic_config.attributes["connection"] = connection
    if not _has_alembic_revision(connection):
        tables = set(inspect(connection).get_table_names()) - {"alembic_version"}
        if tables:
            command.stamp(alembic_config, _detect_legacy_revision(connection))
    command.upgrade(alembic_config, "head")


async def upgrade_database(async_engine: AsyncEngine = engine):
    alembic_config = Config(toml_file=str(_project_config_path()))
    async with async_engine.begin() as connection:
        await connection.run_sync(_run_alembic_upgrade, alembic_config)
