from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.alembic import (
    _detect_legacy_revision,
    _is_supported_legacy_schema,
    _project_config_path,
    upgrade_database,
)
from module.update.startup import ensure_default_user

CURRENT_REVISION = "0008_rss_bangumi_association"


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


async def _indexes(async_engine, table_name: str):
    async with async_engine.connect() as connection:
        return await connection.run_sync(
            lambda conn: inspect(conn).get_indexes(table_name)
        )


async def _schema_info(async_engine):
    async with async_engine.connect() as connection:
        return await connection.run_sync(
            lambda conn: {
                table: {
                    "columns": {
                        column["name"] for column in inspect(conn).get_columns(table)
                    },
                    "primary_key": tuple(
                        inspect(conn)
                        .get_pk_constraint(table)
                        .get("constrained_columns")
                        or ()
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
                for table in {
                    "bangumi",
                    "bangumi_rss",
                    "rssitem",
                    "torrent",
                    "user",
                    "session",
                    "plexconnection",
                    "plexrefreshjob",
                }
            }
        )


async def _assert_current_schema(async_engine):
    schema = await _schema_info(async_engine)
    assert schema["bangumi"]["columns"] == {
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
        "poster_link",
        "added",
        "rule_name",
        "save_path",
        "deleted",
    }
    assert schema["bangumi_rss"]["columns"] == {"bangumi_id", "rss_id"}
    assert schema["bangumi_rss"]["primary_key"] == ("bangumi_id", "rss_id")
    assert schema["bangumi_rss"]["foreign_keys"] == {
        (("bangumi_id",), "bangumi", ("id",)),
        (("rss_id",), "rssitem", ("id",)),
    }
    assert schema["rssitem"]["columns"] == {
        "id",
        "name",
        "url",
        "aggregate",
        "parser",
        "enabled",
    }
    assert schema["torrent"]["columns"] == {
        "id",
        "bangumi_id",
        "rss_id",
        "name",
        "url",
        "homepage",
        "downloaded",
        "hash",
    }
    assert schema["user"]["columns"] == {"id", "username", "password"}
    assert schema["session"]["columns"] == {
        "id",
        "token_hash",
        "created_at",
        "expires_at",
    }
    assert schema["session"]["primary_key"] == ("id",)
    assert schema["plexconnection"]["columns"] == {
        "id",
        "client_identifier",
        "token",
        "account_reauth_required",
        "server_token",
        "server_identifier",
        "url",
        "section_id",
        "path",
        "enabled",
    }
    assert schema["plexrefreshjob"]["columns"] == {
        "path",
        "revision",
        "created_at",
        "updated_at",
    }
    assert schema["plexrefreshjob"]["primary_key"] == ("path",)
    assert schema["session"]["foreign_keys"] == set()
    assert schema["user"]["primary_key"] == ("id",)
    assert schema["torrent"]["primary_key"] == ("id",)
    assert schema["torrent"]["foreign_keys"] == {
        (("bangumi_id",), "bangumi", ("id",)),
    }
    assert any(
        index["name"] == "uq_rssitem_url" and index["unique"]
        for index in await _indexes(async_engine, "rssitem")
    )
    indexes = await _indexes(async_engine, "torrent")
    assert any(
        index["name"] == "uq_torrent_url" and index["unique"] for index in indexes
    )
    assert "save_path" not in schema["torrent"]["columns"]
    assert "item_path" not in schema["rssitem"]["columns"]
    assert "combine" not in schema["rssitem"]["columns"]
    assert "refer_id" not in schema["torrent"]["columns"]


def _patch_startup_dependencies(async_engine, monkeypatch, tmp_path):
    import module.core.program as program_module
    import module.update.startup as startup_module
    import module.update.torrent_hash as hash_module

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(
        program_module,
        "session_factory",
        lambda: AsyncSession(async_engine, expire_on_commit=False),
    )
    monkeypatch.setattr(
        startup_module,
        "session_factory",
        lambda: AsyncSession(async_engine, expire_on_commit=False),
    )
    monkeypatch.setattr(
        hash_module,
        "session_factory",
        lambda: AsyncSession(async_engine, expire_on_commit=False),
    )


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
                'eps_collect BOOLEAN NOT NULL, "offset" INTEGER NOT NULL, '
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
        await connection.execute(
            text(f"CREATE TABLE torrent ({torrent_columns}{foreign_keys})")
        )
        await connection.execute(
            text(
                "CREATE TABLE user (id INTEGER PRIMARY KEY, username VARCHAR NOT NULL, "
                "password VARCHAR NOT NULL)"
            )
        )
        await _insert_bangumi(connection)
        await connection.execute(
            text(
                "INSERT INTO rssitem VALUES (1, 'Current', 'https://example.test/rss', 1, 'mikan', 1)"
            )
        )
        torrent_columns = "id, bangumi_id, rss_id, name, url, homepage, downloaded"
        torrent_values = "1, 1, 1, 'Torrent', 'magnet:?xt=test', NULL, 0"
        if has_hash:
            torrent_columns += ", hash"
            torrent_values += ", NULL"
        await connection.execute(
            text(f"INSERT INTO torrent ({torrent_columns}) VALUES ({torrent_values})")
        )
        await connection.execute(
            text("INSERT INTO user VALUES (1, 'admin', 'hashed-password')")
        )
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
    monkeypatch.setattr(
        program_module, "upgrade_database", lambda: upgrade_database(async_engine)
    )
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
    monkeypatch.setattr(
        program_module, "upgrade_database", lambda: upgrade_database(async_engine)
    )
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
    assert (
        await _scalar(async_engine, "SELECT version_num FROM alembic_version")
        == CURRENT_REVISION
    )

    result = await program_module.Program().startup()

    assert result == {"status": "First run detected."}
    assert attempts == 2
    assert await _scalar(async_engine, "SELECT COUNT(*) FROM user") == 1
    assert (tmp_path / "data" / "posters").is_dir()
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_default_user_is_idempotent(tmp_path, monkeypatch):
    import module.update.startup as startup_module

    async_engine = await _make_git_schema_fixture(tmp_path / "user.db", "current")
    async with async_engine.begin() as connection:
        await connection.execute(text("DELETE FROM user"))
    monkeypatch.setattr(
        startup_module,
        "session_factory",
        lambda: AsyncSession(async_engine, expire_on_commit=False),
    )

    assert await startup_module.ensure_default_user() is True
    assert await startup_module.ensure_default_user() is False
    assert await _scalar(async_engine, "SELECT COUNT(*) FROM user") == 1
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_poster_cache_repairs_missing_poster_with_tmdb(
    tmp_path, monkeypatch
):
    import module.service.bangumi as bangumi_service_module
    from module.service.bangumi import BangumiService

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
    monkeypatch.setattr(bangumi_service_module, "TitleParser", FakeParser)

    async with AsyncSession(async_engine, expire_on_commit=False) as session:
        await BangumiService(session).ensure_poster_cache()

    assert calls == ["mikan", "tmdb"]
    assert (tmp_path / "data" / "posters" / "repaired.jpg").read_bytes() == b"poster"
    assert (
        await _scalar(async_engine, "SELECT poster_link FROM bangumi")
        == "posters/repaired.jpg"
    )
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_poster_cache_repairs_missing_poster_with_mikan(
    tmp_path, monkeypatch
):
    import module.service.bangumi as bangumi_service_module
    from module.service.bangumi import BangumiService

    async_engine = await _make_git_schema_fixture(
        tmp_path / "mikan-poster.db", "current"
    )
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
    monkeypatch.setattr(bangumi_service_module, "TitleParser", FakeParser)

    async with AsyncSession(async_engine, expire_on_commit=False) as session:
        await BangumiService(session).ensure_poster_cache()

    assert calls == [("mikan", "https://mikan.example/torrent")]
    assert (
        await _scalar(async_engine, "SELECT poster_link FROM bangumi")
        == "posters/from-mikan.jpg"
    )
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_poster_cache_skips_existing_poster(tmp_path, monkeypatch):
    import module.service.bangumi as bangumi_service_module
    from module.service.bangumi import BangumiService

    async_engine = await _make_git_schema_fixture(
        tmp_path / "existing-poster.db", "current"
    )
    async with async_engine.begin() as connection:
        await connection.execute(
            text("UPDATE bangumi SET poster_link = 'posters/existing.jpg'")
        )
    monkeypatch.chdir(tmp_path)
    Path("data/posters").mkdir(parents=True)
    Path("data/posters/existing.jpg").write_bytes(b"original")

    class FakeParser:
        async def mikan_parser(self, _homepage):
            raise AssertionError("existing poster must not invoke Mikan parser")

        async def tmdb_poster_parser(self, _bangumi):
            raise AssertionError("existing poster must not invoke TMDB parser")

    monkeypatch.setattr(bangumi_service_module, "TitleParser", FakeParser)

    async with AsyncSession(async_engine, expire_on_commit=False) as session:
        await BangumiService(session).ensure_poster_cache()

    assert Path("data/posters/existing.jpg").read_bytes() == b"original"
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_torrent_hashes_noops_when_hashes_exist(tmp_path, monkeypatch):
    import module.update.torrent_hash as hash_module

    async_engine = await _make_git_schema_fixture(tmp_path / "hashes.db", "current")
    async with async_engine.begin() as connection:
        await connection.execute(text("UPDATE torrent SET hash = 'existing-hash'"))
    monkeypatch.setattr(
        hash_module,
        "session_factory",
        lambda: AsyncSession(async_engine, expire_on_commit=False),
    )

    await hash_module.ensure_torrent_hashes()

    assert await _scalar(async_engine, "SELECT hash FROM torrent") == "existing-hash"
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_torrent_hashes_repairs_missing_hash(tmp_path, monkeypatch):
    import module.service.torrent as service_torrent_module
    import module.update.torrent_hash as hash_module

    async_engine = await _make_git_schema_fixture(
        tmp_path / "missing-hash.db", "current"
    )
    monkeypatch.setattr(
        hash_module,
        "session_factory",
        lambda: AsyncSession(async_engine, expire_on_commit=False),
    )
    monkeypatch.setattr(
        service_torrent_module.torrent_hash,
        "from_magnet",
        lambda _url: "resolved-hash",
    )

    await hash_module.ensure_torrent_hashes()

    assert await _scalar(async_engine, "SELECT hash FROM torrent") == "resolved-hash"
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_ensure_torrent_hashes_repairs_only_missing_rows(tmp_path, monkeypatch):
    import module.service.torrent as service_torrent_module
    import module.update.torrent_hash as hash_module

    async_engine = await _make_git_schema_fixture(
        tmp_path / "mixed-hashes.db", "current"
    )
    async with async_engine.begin() as connection:
        await connection.execute(
            text(
                "INSERT INTO torrent "
                "(id, bangumi_id, rss_id, name, url, homepage, downloaded, hash) "
                "VALUES (2, 1, 1, 'Existing', 'magnet:?xt=keep', NULL, 0, 'keep-hash')"
            )
        )
        await connection.execute(
            text(
                "INSERT INTO torrent "
                "(id, bangumi_id, rss_id, name, url, homepage, downloaded, hash) "
                "VALUES (3, 1, 1, 'Malformed', 'magnet:?xt=invalid', NULL, 0, NULL)"
            )
        )
    resolved_urls = []

    def parse_magnet(url):
        if url == "magnet:?xt=invalid":
            raise ValueError("malformed magnet")
        resolved_urls.append(url)
        return "repaired-hash"

    monkeypatch.setattr(
        hash_module,
        "session_factory",
        lambda: AsyncSession(async_engine, expire_on_commit=False),
    )
    monkeypatch.setattr(
        service_torrent_module.torrent_hash,
        "from_magnet",
        parse_magnet,
    )

    await hash_module.ensure_torrent_hashes()

    assert resolved_urls == ["magnet:?xt=test"]
    assert (
        await _scalar(async_engine, "SELECT hash FROM torrent WHERE id = 1")
        == "repaired-hash"
    )
    assert (
        await _scalar(async_engine, "SELECT hash FROM torrent WHERE id = 2")
        == "keep-hash"
    )
    assert await _scalar(async_engine, "SELECT hash FROM torrent WHERE id = 3") is None
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_torrent_url_migration_keeps_complete_rows_and_removes_invalid_rows(
    tmp_path,
):
    database_path = tmp_path / "torrent-url-cleanup.db"
    async_engine = await _make_git_schema_fixture(database_path, "current")
    async with async_engine.begin() as connection:
        await connection.execute(
            text(
                "INSERT INTO torrent "
                "(id, bangumi_id, rss_id, name, url, homepage, downloaded, hash) "
                "VALUES "
                "(2, 1, 1, 'Complete', 'magnet:?xt=test', "
                "'https://torrent.test/home', 1, 'complete-hash'), "
                "(3, 1, 1, 'Tie first', 'magnet:?xt=tie', NULL, 0, NULL), "
                "(4, 1, 1, 'Tie second', 'magnet:?xt=tie', NULL, 0, NULL), "
                "(5, 1, 1, 'More complete', 'magnet:?xt=merge', NULL, 1, 'merge-hash'), "
                "(6, 1, 1, 'Less complete', 'magnet:?xt=merge', "
                "'https://torrent.test/merge', 0, NULL), "
                "(7, 1, 1, 'Empty', '', NULL, 0, NULL), "
                "(8, 1, 1, 'Whitespace', '   ', NULL, 0, NULL), "
                "(9, NULL, 1, 'Missing Bangumi', 'magnet:?xt=missing-bangumi', NULL, 0, NULL), "
                "(10, 1, NULL, 'Missing RSS', 'magnet:?xt=missing-rss', NULL, 0, NULL)"
            )
        )

    await upgrade_database(async_engine)

    async with async_engine.connect() as connection:
        rows = (
            (
                await connection.execute(
                    text(
                        "SELECT id, bangumi_id, rss_id, name, url, homepage, downloaded, hash "
                        "FROM torrent ORDER BY id"
                    )
                )
            )
            .mappings()
            .all()
        )

    assert [(row["id"], row["name"], row["url"]) for row in rows] == [
        (2, "Complete", "magnet:?xt=test"),
        (3, "Tie first", "magnet:?xt=tie"),
        (5, "More complete", "magnet:?xt=merge"),
    ]
    winner = rows[-1]
    assert winner["rss_id"] == 1
    assert winner["homepage"] is None
    assert bool(winner["downloaded"])
    assert winner["hash"] == "merge-hash"
    assert any(
        index["name"] == "uq_torrent_url" and index["unique"]
        for index in await _indexes(async_engine, "torrent")
    )
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_fresh_upgrade_creates_current_schema(tmp_path):
    async_engine = create_async_engine(_async_url(tmp_path / "fresh.db"))

    await upgrade_database(async_engine)

    assert (
        await _scalar(async_engine, "SELECT version_num FROM alembic_version")
        == CURRENT_REVISION
    )
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
async def test_unversioned_git_schema_adopts_to_head(
    tmp_path, state, expected_revision
):
    async_engine = await _make_git_schema_fixture(tmp_path / f"{state}.db", state)
    async with async_engine.connect() as connection:
        assert await connection.run_sync(_detect_legacy_revision) == expected_revision

    await upgrade_database(async_engine)

    assert await _scalar(async_engine, "SELECT COUNT(*) FROM torrent") == 1
    assert await _scalar(async_engine, "SELECT password FROM user") == "hashed-password"
    assert (
        await _scalar(async_engine, "SELECT version_num FROM alembic_version")
        == CURRENT_REVISION
    )
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
    assert (
        await _scalar(
            async_engine,
            "SELECT COUNT(*) FROM sqlite_master WHERE name = 'alembic_version'",
        )
        == 0
    )
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
    assert (
        await _scalar(
            async_engine,
            "SELECT COUNT(*) FROM sqlite_master WHERE name = 'alembic_version'",
        )
        == 0
    )
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
    assert (
        await _scalar(
            async_engine,
            "SELECT COUNT(*) FROM sqlite_master WHERE name = 'alembic_version'",
        )
        == 0
    )
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
async def test_real_migration_failure_aborts_startup_without_false_head(
    tmp_path, monkeypatch
):
    import module.core.program as program_module

    async_engine = await _make_git_schema_fixture(tmp_path / "failed.db", "baseline")

    def fail_hash_migration(
        _connection, _cursor, statement, _parameters, _context, _executemany
    ):
        if "HASH" in statement.upper() and "TORRENT" in statement.upper():
            raise RuntimeError("injected migration failure")

    event.listen(async_engine.sync_engine, "before_cursor_execute", fail_hash_migration)
    monkeypatch.setattr(
        program_module, "upgrade_database", lambda: upgrade_database(async_engine)
    )

    try:
        with pytest.raises(RuntimeError, match="injected migration failure"):
            await program_module.Program().startup()
    finally:
        event.remove(
            async_engine.sync_engine, "before_cursor_execute", fail_hash_migration
        )

    assert "hash" not in await _columns(async_engine, "torrent")
    version_table_exists = await _scalar(
        async_engine,
        "SELECT COUNT(*) FROM sqlite_master WHERE name = 'alembic_version'",
    )
    if version_table_exists:
        assert await _scalar(
            async_engine, "SELECT version_num FROM alembic_version"
        ) in {
            None,
            "0001_baseline",
        }
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_rss_association_migration_repairs_legacy_data(tmp_path):
    async_engine = await _make_git_schema_fixture(
        tmp_path / "rss-associations.db", "current"
    )
    async with async_engine.begin() as connection:
        await connection.execute(
            text(
                "INSERT INTO rssitem (id, name, url, aggregate, parser, enabled) "
                "VALUES "
                "(2, 'Duplicated', 'HTTPS://EXAMPLE.TEST:443/rss', 0, 'federation', 0), "
                "(3, 'Empty', '', 0, 'mikan', 1), "
                "(4, 'Broken', 'file:///rss', 0, 'mikan', 1), "
                "(5, 'Other', 'https://example.test/other', 0, 'mikan', 1)"
            )
        )
        await connection.execute(
            text(
                "INSERT INTO torrent "
                "(id, bangumi_id, rss_id, name, url, homepage, downloaded, hash) "
                "VALUES "
                "(2, 1, 2, 'Duplicate feed source', 'magnet:?xt=duplicate', "
                "NULL, 0, NULL), "
                "(3, 1, 3, 'Empty feed source', 'magnet:?xt=empty', NULL, 0, NULL), "
                "(4, 1, 4, 'Broken feed source', 'magnet:?xt=broken', NULL, 0, NULL)"
            )
        )
        await connection.execute(
            text("UPDATE bangumi SET rss_link = :links WHERE id = 1"),
            {
                "links": (
                    "https://example.test/other,https://missing.test/rss,"
                    "https://EXAMPLE.TEST:443/rss,https://example.test/rss"
                )
            },
        )

    await upgrade_database(async_engine)

    async with async_engine.connect() as connection:
        feeds = (
            await connection.execute(
                text(
                    "SELECT id, name, url, aggregate, parser, enabled "
                    "FROM rssitem ORDER BY id"
                )
            )
        ).all()
        torrents = (
            await connection.execute(text("SELECT id, rss_id FROM torrent ORDER BY id"))
        ).all()
        associations = (
            await connection.execute(
                text("SELECT bangumi_id, rss_id FROM bangumi_rss ORDER BY rss_id")
            )
        ).all()

    assert feeds == [
        (1, "Current", "https://example.test/rss", 1, "mikan", 1),
        (5, "Other", "https://example.test/other", 0, "mikan", 1),
    ]
    assert torrents == [(1, 1)]
    assert associations == [(1, 1), (1, 5)]
    assert any(
        index["name"] == "uq_rssitem_url" and index["unique"]
        for index in await _indexes(async_engine, "rssitem")
    )
    await _assert_current_schema(async_engine)
    await async_engine.dispose()


@pytest.mark.asyncio
async def test_rss_association_migration_downgrade_reconstructs_feeds(tmp_path):
    async_engine = await _make_git_schema_fixture(
        tmp_path / "rss-association-downgrade.db", "current"
    )
    async with async_engine.begin() as connection:
        await connection.execute(
            text(
                "INSERT INTO rssitem (id, name, url, aggregate, parser, enabled) "
                "VALUES (2, 'Other', 'https://example.test/other', 0, 'mikan', 1)"
            )
        )
        await connection.execute(
            text("UPDATE bangumi SET rss_link = :links WHERE id = 1"),
            {"links": "https://example.test/other,https://example.test/rss"},
        )

    await upgrade_database(async_engine)

    def downgrade(connection):
        project_config_path = _project_config_path()
        config = Config(toml_file=str(project_config_path))
        config.set_main_option(
            "script_location", str(project_config_path.parent / "migrations")
        )
        config.attributes["connection"] = connection
        command.downgrade(config, "0007_unique_torrent_url")

    async with async_engine.begin() as connection:
        await connection.run_sync(downgrade)

    assert (
        await _scalar(async_engine, "SELECT version_num FROM alembic_version")
        == "0007_unique_torrent_url"
    )
    restored_links = await _scalar(
        async_engine, "SELECT rss_link FROM bangumi WHERE id = 1"
    )
    assert set(restored_links.split(",")) == {
        "https://example.test/rss",
        "https://example.test/other",
    }
    async with async_engine.connect() as connection:
        tables = await connection.run_sync(
            lambda sync_connection: set(inspect(sync_connection).get_table_names())
        )
    assert "bangumi_rss" not in tables
    assert not any(
        index["name"] == "uq_rssitem_url" and index["unique"]
        for index in await _indexes(async_engine, "rssitem")
    )
    await async_engine.dispose()
