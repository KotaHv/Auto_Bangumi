import sqlite3
from pathlib import Path

from module.database.log import LogDatabase


def test_log_database_is_backed_up_only_when_migrated(tmp_path: Path) -> None:
    database_path = tmp_path / "logs.db"

    database = LogDatabase(database_path)
    backup_paths = list(tmp_path.glob("logs.db.*.bak"))
    database.dispose()

    assert len(backup_paths) == 1
    with sqlite3.connect(backup_paths[0]) as backup:
        assert (
            backup.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' "
                "AND name = 'log_entries'"
            ).fetchone()
            is None
        )

    database = LogDatabase(database_path)
    database.dispose()

    assert list(tmp_path.glob("logs.db.*.bak")) == backup_paths
