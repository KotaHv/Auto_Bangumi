"""Remove invalid and duplicate torrent rows before enforcing URL uniqueness.

Rows with an empty URL or missing Bangumi/RSS association are removed. Duplicate
URLs keep the row with the most complete data; ties keep the lowest ID.
"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0007_unique_torrent_url"
down_revision = "0006_add_plex_refresh_queue"
branch_labels = None
depends_on = None

logger = logging.getLogger("alembic.runtime.migration")


def _completeness(row) -> int:
    fields = ("name", "homepage", "hash")
    return sum(bool(row[field]) for field in fields) + bool(row["downloaded"])


def _remove_invalid_and_duplicate_torrents(connection) -> tuple[int, int]:
    rows = (
        connection.execute(
            sa.text(
                "SELECT id, bangumi_id, rss_id, name, url, homepage, downloaded, hash "
                "FROM torrent ORDER BY id"
            )
        )
        .mappings()
        .all()
    )
    invalid_ids = []
    groups = {}
    for row in rows:
        url = row["url"]
        if (
            not isinstance(url, str)
            or not url.strip()
            or row["bangumi_id"] is None
            or row["rss_id"] is None
        ):
            invalid_ids.append(row["id"])
            continue
        groups.setdefault(url, []).append(row)

    for row_id in invalid_ids:
        connection.exec_driver_sql("DELETE FROM torrent WHERE id = ?", (row_id,))

    duplicate_count = 0
    for duplicates in groups.values():
        if len(duplicates) < 2:
            continue

        survivor = duplicates[0]
        survivor_score = _completeness(survivor)
        for candidate in duplicates[1:]:
            candidate_score = _completeness(candidate)
            if candidate_score > survivor_score or (
                candidate_score == survivor_score and candidate["id"] < survivor["id"]
            ):
                row_id = survivor["id"]
                survivor = candidate
                survivor_score = candidate_score
            else:
                row_id = candidate["id"]

            connection.exec_driver_sql("DELETE FROM torrent WHERE id = ?", (row_id,))
            duplicate_count += 1

    return len(invalid_ids), duplicate_count


def upgrade():
    connection = op.get_bind()
    invalid_count, duplicate_count = _remove_invalid_and_duplicate_torrents(connection)
    logger.info(
        "Removed %d invalid torrent rows and %d duplicate rows.",
        invalid_count,
        duplicate_count,
    )
    op.create_index("uq_torrent_url", "torrent", ["url"], unique=True)


def downgrade():
    op.drop_index("uq_torrent_url", table_name="torrent")
