from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.ext.asyncio import create_async_engine

from module.database.alembic import (
    _detect_legacy_revision,
    _is_supported_legacy_schema,
    upgrade_database,
)
from module.update.startup import ensure_default_user

ALEMBIC_CONFIG = Path(__file__).resolve().parents[2] / "pyproject.toml"
CURRENT_REVISION = "0004_add_session"


def _async_url(path: Path) -> str:
    return f"sqlite+aiosqlite:///{path}"


async def _scalar(async_engine, statement: str):
    async with async_engine.connect() as connection:
        return await connection.scalar(text(statement))


async def _columns(async_engine, table_name: str):
    async with async_engine.connect() as connection:
        return await connection.run_sync(
            lambda conn: {
                column["name"] for column in inspect(conn).get_columns(table_name)
            }
        )


async def _schema_info(async_engine):
    async with async_engine.connect() as connection:
        return await connection.run_sync(
            lambda conn: {
                table: {
                    "columns": {column["name"] for column in inspect(conn).get_columns(table)},
                    "primary_key": tuple(
                        inspect(conn).get_pk_constraint(table).get("constrained_columns") or ()
                    ),
                    "foreign_keys": {
                        (
                            tuple(foreign_key["constrained_columns"]),
                            foreign_key["referred_table"],
                            tuple(foreign_key["referred_columns"]),
                        )
                        for foreign_key in inspect(conn).get_foreign_keys(table)
                    },
                }
                for table in {"bangumi", "rssitem", "torrent", "user", "session"}
            }
        )


async def _assert_current_schema(async_engine):
    schema = await _schema_info(async_engine)
    assert schema["rssitem"]["columns"] == {
        "id", "name", "url", "aggregate", "parser", "enabled"
    }
    assert schema["torrent"]["columns"] == {
        "id", "bangumi_id", "rss_id", "name", "url", "homepage", "downloaded", "hash"
    }
    assert schema["user"]["columns"] == {"id", "username", "password"}
    assert schema["session"]["columns"] == {
        "id", "token_hash", "created_at", "expires_at"
    }
    assert schema["session"]["primary_key"] == ("id",)
    assert schema["session"]["foreign_keys"] == set()
    assert schema["user"]["primary_key"] == ("id",)
    assert schema["torrent"]["primary_key"] == ("id",)
    assert schema["torrent"]["foreign_keys"] == {
        (("bangumi_id",), "bangumi", ("id",)),
    }
    assert "save_path" not in schema["torrent"]["columns"]
    assert "item_path" not in schema["rssitem"]["columns"]
    assert "combine" not in schema["rssitem"]["columns"]
    assert "refer_id" not in schema["torrent"]["columns"]


async def _upgrade_to(async_engine, revision: str):
    alembic_config = Config(toml_file=str(ALEMBIC_CONFIG))

    def upgrade(connection):
        alembic_config.attributes["connection"] = connection
        command.upgrade(alembic_config, revision)

    async with async_engine.begin() as connection:
        await connection.run_sync(upgrade)


def _patch_startup_dependencies(async_engine, monkeypatch, tmp_path):
    import module.update.poster_cache as poster_module
    import module.update.startup as startup_module
    import module.update.torrent_hash as hash_module

    real_rss_engine = startup_module.RSSEngine
    monkeypatch.setattr(
        startup_module,
        "RSSEngine",
        lambda: real_rss_engine(async_engine),
    )
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(poster_module, "RSSEngine", lambda: real_rss_engine(async_engine))
    monkeypatch.setattr(hash_module, "RSSEngine", lambda: real_rss_engine(async_engine))


async def _insert_bangumi(connection):
    await connection.execute(
        text(
            "INSERT INTO bangumi (id, official_title, year, title_raw, season, season_raw, "
            'group_name, dpi, source, subtitle, eps_collect, "offset", filter, rss_link, '
            "poster_link, added, rule_name, save_path, deleted) VALUES "
            "(1, 'Show', '2024', 'Show', 1, NULL, NULL, NULL, NULL, NULL, 0, 0, "
            "'720', '', NULL, 0, NULL, NULL, 0)"
        )
    )


async def _make_git_schema_fixture(path: Path, state: str):
    async_engine = create_async_engine(_async_url(path))
    has_hash = state in {"hash", "current"}
    has_rss_foreign_key = state in {"baseline", "hash"}
    async with async_engine.begin() as connection:
        await connection.execute(
            text(
                "CREATE TABLE bangumi ("
                "id INTEGER PRIMARY KEY, official_title VARCHAR NOT NULL, year VARCHAR, "
                "title_raw VARCHAR NOT NULL, season INTEGER NOT NULL, season_raw VARCHAR, "
                "group_name VARCHAR, dpi VARCHAR, source VARCHAR, subtitle VARCHAR, "
                "eps_collect BOOLEAN NOT NULL, \"offset\" INTEGER NOT NULL, "
                "filter VARCHAR NOT NULL, rss_link VARCHAR NOT NULL, poster_link VARCHAR, "
                "added BOOLEAN NOT NULL, rule_name VARCHAR, save_path VARCHAR, "
                "deleted BOOLEAN NOT NULL)"
            )
        )
        await connection.execute(
            text(
                "CREATE TABLE rssitem (id INTEGER PRIMARY KEY, name VARCHAR, "
                "url VARCHAR NOT NULL, aggregate BOOLEAN NOT NULL, parser VARCHAR NOT NULL, "
                "enabled BOOLEAN NOT NULL)"
            )
        )
        torrent_columns = (
            "id INTEGER PRIMARY KEY, bangumi_id INTEGER, rss_id INTEGER, "
            "name VARCHAR NOT NULL, url VARCHAR NOT NULL, homepage VARCHAR, "
            "downloaded BOOLEAN NOT NULL"
        )
        if has_hash:
            torrent_columns += ", hash VARCHAR"
        foreign_keys = ", FOREIGN KEY (bangumi_id) REFERENCES bangumi(id)"
        if has_rss_foreign_key:
            foreign_keys += ", FOREIGN KEY (rss_id) REFERENCES rssitem(id)"
        await connection.execute(text(f"CREATE TABLE torrent ({torrent_columns}{foreign_keys})"))
        await connection.execute(
            text(
                "CREATE TABLE user (id INTEGER PRIMARY KEY, username VARCHAR NOT NULL, "
                "password VARCHAR NOT NULL)"
            )
        )
        await _insert_bangumi(connection)
        await connection.execute(text("INSERT INTO rssitem VALUES (1, 'Current', 'https://example.test/rss', 1, 'mikan', 1)"))
        torrent_columns = "id, bangumi_id, rss_id, name, url, homepage, downloaded"
        torrent_values = "1, 1, 1, 'Torrent', 'magnet:?xt=test', NULL, 0"
        if has_hash:
            torrent_columns += ", hash"
            torrent_values += ", NULL"
        await connection.execute(text(f"INSERT INTO torrent ({torrent_columns}) VALUES ({torrent_values})"))
        await connection.execute(text("INSERT INTO user VALUES (1, 'admin', 'hashed-password')"))
    return async_engine


@pytest.mark.asyncio
async def test_missing_database_is_fresh_and_seeded(tmp_path, monkeypatch):
    async_engine = create_async_engine(_async_url(tmp_path / "missing.db"))

    await upgrade_database(async_engine)
    _patch_startup_dependencies(async_engine, monkeypatch, tmp_path)
    await ensure_default_user()

    assert await _scalar(async_engine, "SELECT username FROM user") == "admin"
    await _assert_current_schema(async_engine)
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_existing_empty_database_is_fresh_and_seeded(tmp_path, monkeypatch):
    import module.core.program as program_module

    path = tmp_path / "empty.db"
    path.touch()
    async_engine = create_async_engine(_async_url(path))
    monkeypatch.setattr(program_module, "upgrade_database", lambda: upgrade_database(async_engine))
    _patch_startup_dependencies(async_engine, monkeypatch, tmp_path)
    monkeypatch.setattr(
        program_module,
        "ensure_default_user",
        lambda: ensure_default_user(),
    )

    result = await program_module.Program().startup()

    assert result == {"status": "First run detected."}
    await _assert_current_schema(async_engine)
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_default_user_retries_after_failure(tmp_path, monkeypatch):
    import module.core.program as program_module
    import module.update.startup as startup_module

    async_engine = create_async_engine(_async_url(tmp_path / "retry.db"))
    monkeypatch.setattr(program_module, "upgrade_database", lambda: upgrade_database(async_engine))
    _patch_startup_dependencies(async_engine, monkeypatch, tmp_path)
    real_ensure_default_user = startup_module.ensure_default_user
    attempts = 0

    async def fail_before_user_once():
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("injected initialization failure")
        return await real_ensure_default_user()

    monkeypatch.setattr(
        program_module,
        "ensure_default_user",
        fail_before_user_once,
    )

    with pytest.raises(RuntimeError, match="injected initialization failure"):
        await program_module.Program().startup()
    assert await _scalar(async_engine, "SELECT version_num FROM alembic_version") == CURRENT_REVISION

    result = await program_module.Program().startup()

    assert result == {"status": "First run detected."}
    assert attempts == 2
    assert await _scalar(async_engine, "SELECT COUNT(*) FROM user") == 1
    assert (tmp_path / "data" / "posters").is_dir()
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_default_user_is_idempotent(tmp_path, monkeypatch):
    import module.update.startup as startup_module
    from module.rss import RSSEngine

    async_engine = await _make_git_schema_fixture(tmp_path / "user.db", "current")
    async with async_engine.begin() as connection:
        await connection.execute(text("DELETE FROM user"))
    monkeypatch.setattr(startup_module, "RSSEngine", lambda: RSSEngine(async_engine))

    assert await startup_module.ensure_default_user() is True
    assert await startup_module.ensure_default_user() is False
    assert await _scalar(async_engine, "SELECT COUNT(*) FROM user") == 1
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_poster_cache_repairs_missing_poster_with_tmdb(
    tmp_path, monkeypatch
):
    import module.update.poster_cache as poster_module
    from module.rss import RSSEngine

    async_engine = await _make_git_schema_fixture(tmp_path / "posters.db", "current")
    async with async_engine.begin() as connection:
        await connection.execute(
            text("UPDATE torrent SET homepage = 'https://mikan.example/torrent'")
        )
    calls = []

    class FakeParser:
        async def mikan_parser(self, _homepage):
            calls.append("mikan")
            return "", ""

        async def tmdb_poster_parser(self, bangumi):
            calls.append("tmdb")
            bangumi.poster_link = "posters/repaired.jpg"
            Path("data/posters/repaired.jpg").write_bytes(b"poster")

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(poster_module, "RSSEngine", lambda: RSSEngine(async_engine))
    monkeypatch.setattr(poster_module, "TitleParser", FakeParser)

    await poster_module.ensure_poster_cache()

    assert calls == ["mikan", "tmdb"]
    assert (tmp_path / "data" / "posters" / "repaired.jpg").read_bytes() == b"poster"
    assert await _scalar(async_engine, "SELECT poster_link FROM bangumi") == "posters/repaired.jpg"
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_poster_cache_repairs_missing_poster_with_mikan(
    tmp_path, monkeypatch
):
    import module.update.poster_cache as poster_module
    from module.rss import RSSEngine

    async_engine = await _make_git_schema_fixture(tmp_path / "mikan-poster.db", "current")
    async with async_engine.begin() as connection:
        await connection.execute(
            text("UPDATE bangumi SET poster_link = 'posters/missing.jpg'")
        )
        await connection.execute(
            text("UPDATE torrent SET homepage = 'https://mikan.example/torrent'")
        )
    calls = []

    class FakeParser:
        async def mikan_parser(self, homepage):
            calls.append(("mikan", homepage))
            Path("data/posters/from-mikan.jpg").write_bytes(b"poster")
            return "posters/from-mikan.jpg", "Show"

        async def tmdb_poster_parser(self, _bangumi):
            calls.append(("tmdb",))

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(poster_module, "RSSEngine", lambda: RSSEngine(async_engine))
    monkeypatch.setattr(poster_module, "TitleParser", FakeParser)

    await poster_module.ensure_poster_cache()

    assert calls == [("mikan", "https://mikan.example/torrent")]
    assert await _scalar(async_engine, "SELECT poster_link FROM bangumi") == "posters/from-mikan.jpg"
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_poster_cache_skips_existing_poster(tmp_path, monkeypatch):
    import module.update.poster_cache as poster_module
    from module.rss import RSSEngine

    async_engine = await _make_git_schema_fixture(tmp_path / "existing-poster.db", "current")
    async with async_engine.begin() as connection:
        await connection.execute(text("UPDATE bangumi SET poster_link = 'posters/existing.jpg'"))
    monkeypatch.chdir(tmp_path)
    Path("data/posters").mkdir(parents=True)
    Path("data/posters/existing.jpg").write_bytes(b"original")

    class FakeParser:
        async def mikan_parser(self, _homepage):
            raise AssertionError("existing poster must not invoke Mikan parser")

        async def tmdb_poster_parser(self, _bangumi):
            raise AssertionError("existing poster must not invoke TMDB parser")

    monkeypatch.setattr(poster_module, "RSSEngine", lambda: RSSEngine(async_engine))
    monkeypatch.setattr(poster_module, "TitleParser", FakeParser)

    await poster_module.ensure_poster_cache()

    assert Path("data/posters/existing.jpg").read_bytes() == b"original"
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_torrent_hashes_noops_when_hashes_exist(tmp_path, monkeypatch):
    import module.update.torrent_hash as hash_module
    from module.rss import RSSEngine

    async_engine = await _make_git_schema_fixture(tmp_path / "hashes.db", "current")
    async with async_engine.begin() as connection:
        await connection.execute(text("UPDATE torrent SET hash = 'existing-hash'"))
    monkeypatch.setattr(hash_module, "RSSEngine", lambda: RSSEngine(async_engine))

    await hash_module.ensure_torrent_hashes()

    assert await _scalar(async_engine, "SELECT hash FROM torrent") == "existing-hash"
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_torrent_hashes_repairs_missing_hash(tmp_path, monkeypatch):
    import module.update.torrent_hash as hash_module
    from module.rss import RSSEngine

    async_engine = await _make_git_schema_fixture(tmp_path / "missing-hash.db", "current")
    monkeypatch.setattr(hash_module, "RSSEngine", lambda: RSSEngine(async_engine))
    monkeypatch.setattr(
        hash_module.torrent_hash,
        "from_magnet",
        lambda _url: "resolved-hash",
    )

    await hash_module.ensure_torrent_hashes()

    assert await _scalar(async_engine, "SELECT hash FROM torrent") == "resolved-hash"
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_torrent_hashes_repairs_only_missing_rows(tmp_path, monkeypatch):
    import module.update.torrent_hash as hash_module
    from module.rss import RSSEngine

    async_engine = await _make_git_schema_fixture(tmp_path / "mixed-hashes.db", "current")
    async with async_engine.begin() as connection:
        await connection.execute(
            text(
                "INSERT INTO torrent "
                "(id, bangumi_id, rss_id, name, url, homepage, downloaded, hash) "
                "VALUES (2, 1, 1, 'Existing', 'magnet:?xt=keep', NULL, 0, 'keep-hash')"
            )
        )
    resolved_urls = []
    monkeypatch.setattr(hash_module, "RSSEngine", lambda: RSSEngine(async_engine))
    monkeypatch.setattr(
        hash_module.torrent_hash,
        "from_magnet",
        lambda url: resolved_urls.append(url) or "repaired-hash",
    )

    await hash_module.ensure_torrent_hashes()

    assert resolved_urls == ["magnet:?xt=test"]
    assert await _scalar(async_engine, "SELECT hash FROM torrent WHERE id = 1") == "repaired-hash"
    assert await _scalar(async_engine, "SELECT hash FROM torrent WHERE id = 2") == "keep-hash"
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_fresh_upgrade_creates_current_schema(tmp_path):
    async_engine = create_async_engine(_async_url(tmp_path / "fresh.db"))

    await upgrade_database(async_engine)

    assert await _scalar(async_engine, "SELECT version_num FROM alembic_version") == CURRENT_REVISION
    await _assert_current_schema(async_engine)
    await async_engine.dispose()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("state", "expected_revision"),
    [
        ("baseline", "0001_baseline"),
        ("hash", "0002_add_torrent_hash"),
        ("current", "0003_remove_rss_foreign_key"),
    ],
)
async def test_unversioned_git_schema_adopts_to_head(tmp_path, state, expected_revision):
    async_engine = await _make_git_schema_fixture(tmp_path / f"{state}.db", state)
    async with async_engine.connect() as connection:
        assert await connection.run_sync(_detect_legacy_revision) == expected_revision

    await upgrade_database(async_engine)

    assert await _scalar(async_engine, "SELECT COUNT(*) FROM torrent") == 1
    assert await _scalar(async_engine, "SELECT password FROM user") == "hashed-password"
    assert await _scalar(async_engine, "SELECT version_num FROM alembic_version") == CURRENT_REVISION
    await _assert_current_schema(async_engine)
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_unknown_or_partial_schema_fails_closed(tmp_path):
    path = tmp_path / "unknown.db"
    engine = create_engine(f"sqlite:///{path}")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE unrelated (id INTEGER PRIMARY KEY)"))
    engine.dispose()
    async_engine = create_async_engine(_async_url(path))

    with pytest.raises(RuntimeError, match="Unsupported"):
        await upgrade_database(async_engine)
    assert await _scalar(
        async_engine,
        "SELECT COUNT(*) FROM sqlite_master WHERE name = 'alembic_version'",
    ) == 0
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_hash_absent_without_rss_fk_is_unsupported(tmp_path):
    async_engine = await _make_git_schema_fixture(
        tmp_path / "unsupported-combination.db", "unsupported"
    )

    async with async_engine.connect() as connection:
        assert await connection.run_sync(_is_supported_legacy_schema) is False
        with pytest.raises(RuntimeError, match="Unsupported"):
            await connection.run_sync(_detect_legacy_revision)

    with pytest.raises(RuntimeError, match="Unsupported"):
        await upgrade_database(async_engine)
    assert await _scalar(
        async_engine,
        "SELECT COUNT(*) FROM sqlite_master WHERE name = 'alembic_version'",
    ) == 0
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_unknown_extra_column_fails_closed(tmp_path):
    async_engine = await _make_git_schema_fixture(
        tmp_path / "unknown-column.db", "current"
    )

    async with async_engine.begin() as connection:
        await connection.execute(text("ALTER TABLE torrent ADD COLUMN mystery VARCHAR"))

    async with async_engine.connect() as connection:
        assert await connection.run_sync(_is_supported_legacy_schema) is False
        with pytest.raises(RuntimeError, match="Unsupported"):
            await connection.run_sync(_detect_legacy_revision)

    with pytest.raises(RuntimeError, match="Unsupported"):
        await upgrade_database(async_engine)
    assert await _scalar(
        async_engine,
        "SELECT COUNT(*) FROM sqlite_master WHERE name = 'alembic_version'",
    ) == 0
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_already_versioned_database_uses_normal_upgrade(tmp_path):
    async_engine = create_async_engine(_async_url(tmp_path / "versioned.db"))
    await upgrade_database(async_engine)
    before = await _schema_info(async_engine)

    await upgrade_database(async_engine)

    assert await _schema_info(async_engine) == before
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_real_migration_failure_aborts_startup_without_false_head(tmp_path, monkeypatch):
    import module.core.program as program_module

    async_engine = await _make_git_schema_fixture(tmp_path / "failed.db", "baseline")

    def fail_hash_migration(_connection, _cursor, statement, _parameters, _context, _executemany):
        if "HASH" in statement.upper() and "TORRENT" in statement.upper():
            raise RuntimeError("injected migration failure")

    event.listen(async_engine.sync_engine, "before_cursor_execute", fail_hash_migration)
    monkeypatch.setattr(program_module, "upgrade_database", lambda: upgrade_database(async_engine))

    try:
        with pytest.raises(RuntimeError, match="injected migration failure"):
            await program_module.Program().startup()
    finally:
        event.remove(async_engine.sync_engine, "before_cursor_execute", fail_hash_migration)

    assert "hash" not in await _columns(async_engine, "torrent")
    version_table_exists = await _scalar(
        async_engine,
        "SELECT COUNT(*) FROM sqlite_master WHERE name = 'alembic_version'",
    )
    if version_table_exists:
        assert await _scalar(async_engine, "SELECT version_num FROM alembic_version") in {
            None,
            "0001_baseline",
        }
    await async_engine.dispose()
