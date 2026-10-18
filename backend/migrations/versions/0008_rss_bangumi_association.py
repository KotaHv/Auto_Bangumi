"""Normalize RSS URLs and store Bangumi associations in a link table.

RSS rows are canonicalized and deduplicated, rows with an unusable URL are removed
together with their torrents, and unknown legacy links are discarded.
"""

import logging
from collections import defaultdict

import sqlalchemy as sa
from alembic import op
from pydantic import AnyHttpUrl, TypeAdapter, ValidationError

revision = "0008_rss_bangumi_association"
down_revision = "0007_unique_torrent_url"
branch_labels = None
depends_on = None

logger = logging.getLogger("alembic.runtime.migration")

_url_adapter = TypeAdapter(AnyHttpUrl)

_rssitem = sa.table(
    "rssitem",
    sa.column("id", sa.Integer),
    sa.column("name", sa.String),
    sa.column("url", sa.String),
    sa.column("aggregate", sa.Boolean),
)
_bangumi = sa.table(
    "bangumi",
    sa.column("id", sa.Integer),
    sa.column("rss_link", sa.String),
)
_torrent = sa.table("torrent", sa.column("rss_id", sa.Integer))
_bangumi_rss = sa.table(
    "bangumi_rss",
    sa.column("bangumi_id", sa.Integer),
    sa.column("rss_id", sa.Integer),
)


def _valid_url(value: object) -> str | None:
    if not isinstance(value, str) or not (url := value.strip()):
        return None
    try:
        return _url_adapter.validate_python(url).encoded_string()
    except ValidationError:
        return None


def _validate_and_deduplicate(rows) -> tuple[list, list, list]:
    kept, invalid, duplicates = [], [], []
    seen_urls = set()
    for row in rows:
        url = _valid_url(row["url"])
        if url is None:
            invalid.append(row)
            continue
        if url in seen_urls:
            duplicates.append({**row, "url": url})
            continue
        seen_urls.add(url)
        if row["url"] != url:
            logger.warning(
                "Rewriting RSS feed %s URL %r to %r.",
                row["id"],
                row["url"],
                url,
            )
        kept.append({**row, "url": url})
    return kept, invalid, duplicates


def _associate_bangumi_rss(bangumi_rows, rss_by_url) -> list[dict]:
    associations = []
    seen_regular_urls = set()
    for row in bangumi_rows:
        rss_link = row["rss_link"]
        if not isinstance(rss_link, str):
            continue
        seen_urls = set()
        for url in rss_link.split(","):
            if not (valid_url := _valid_url(url)):
                logger.warning(
                    "Discarding invalid RSS link %r of Bangumi %s.",
                    url,
                    row["id"],
                )
                continue
            if valid_url in seen_urls:
                continue
            rss = rss_by_url.get(valid_url)
            if rss is None:
                logger.warning(
                    "Discarding unknown RSS link %r of Bangumi %s.",
                    url,
                    row["id"],
                )
                continue
            if not rss["aggregate"] and valid_url in seen_regular_urls:
                logger.warning(
                    "Discarding regular RSS link %r of Bangumi %s: "
                    "already associated with another Bangumi.",
                    url,
                    row["id"],
                )
                continue
            seen_urls.add(valid_url)
            if not rss["aggregate"]:
                seen_regular_urls.add(valid_url)
            associations.append({"bangumi_id": row["id"], "rss_id": rss["id"]})
    return associations


def upgrade():
    connection = op.get_bind()
    rss_rows = (
        connection.execute(sa.select(_rssitem).order_by(_rssitem.c.id)).mappings().all()
    )
    bangumi_rows = (
        connection.execute(sa.select(_bangumi).order_by(_bangumi.c.id)).mappings().all()
    )

    kept, invalid, duplicates = _validate_and_deduplicate(rss_rows)
    kept_by_url = {row["url"]: row for row in kept}
    associations = _associate_bangumi_rss(bangumi_rows, kept_by_url)

    for row in kept:
        connection.execute(
            sa.update(_rssitem).where(_rssitem.c.id == row["id"]).values(url=row["url"])
        )

    for row in invalid:
        logger.warning(
            "Removing RSS feed %s (%s) with an unusable URL %r and its torrents.",
            row["id"],
            row["name"],
            row["url"],
        )
        connection.execute(sa.delete(_torrent).where(_torrent.c.rss_id == row["id"]))
        connection.execute(sa.delete(_rssitem).where(_rssitem.c.id == row["id"]))

    for row in duplicates:
        survivor = kept_by_url[row["url"]]
        logger.warning(
            "Removing duplicate RSS feed %s (%s) and its torrents; "
            "surviving feed is %s (%s).",
            row["id"],
            row["name"],
            survivor["id"],
            survivor["name"],
        )
        connection.execute(sa.delete(_torrent).where(_torrent.c.rss_id == row["id"]))
        connection.execute(sa.delete(_rssitem).where(_rssitem.c.id == row["id"]))

    op.create_index("uq_rssitem_url", "rssitem", ["url"], unique=True)
    op.create_table(
        "bangumi_rss",
        sa.Column("bangumi_id", sa.Integer(), nullable=False),
        sa.Column("rss_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["bangumi_id"], ["bangumi.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rss_id"], ["rssitem.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("bangumi_id", "rss_id"),
    )
    op.create_index("ix_bangumi_rss_rss_id", "bangumi_rss", ["rss_id"])
    if associations:
        connection.execute(sa.insert(_bangumi_rss).values(associations))
    op.drop_column("bangumi", "rss_link")


def downgrade():
    connection = op.get_bind()
    rows = (
        connection.execute(
            sa.select(_bangumi_rss.c.bangumi_id, _rssitem.c.url)
            .select_from(
                _bangumi_rss.join(_rssitem, _rssitem.c.id == _bangumi_rss.c.rss_id)
            )
            .order_by(_bangumi_rss.c.bangumi_id, _bangumi_rss.c.rss_id)
        )
        .mappings()
        .all()
    )
    urls_by_bangumi = defaultdict(list)
    for row in rows:
        urls_by_bangumi[row["bangumi_id"]].append(row["url"])

    op.add_column(
        "bangumi",
        sa.Column("rss_link", sa.String(), nullable=False, server_default=""),
    )
    for bangumi_id, urls in urls_by_bangumi.items():
        connection.execute(
            sa.update(_bangumi)
            .where(_bangumi.c.id == bangumi_id)
            .values(rss_link=",".join(urls))
        )
    op.drop_index("ix_bangumi_rss_rss_id", table_name="bangumi_rss")
    op.drop_table("bangumi_rss")
    op.drop_index("uq_rssitem_url", table_name="rssitem")
