"""Create the supported legacy database baseline."""

import sqlalchemy as sa

from alembic import op

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "bangumi",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("official_title", sa.String(), nullable=False),
        sa.Column("year", sa.String(), nullable=True),
        sa.Column("title_raw", sa.String(), nullable=False),
        sa.Column("season", sa.Integer(), nullable=False),
        sa.Column("season_raw", sa.String(), nullable=True),
        sa.Column("group_name", sa.String(), nullable=True),
        sa.Column("dpi", sa.String(), nullable=True),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("subtitle", sa.String(), nullable=True),
        sa.Column("eps_collect", sa.Boolean(), nullable=False),
        sa.Column("offset", sa.Integer(), nullable=False),
        sa.Column("filter", sa.String(), nullable=False),
        sa.Column("rss_link", sa.String(), nullable=False),
        sa.Column("poster_link", sa.String(), nullable=True),
        sa.Column("added", sa.Boolean(), nullable=False),
        sa.Column("rule_name", sa.String(), nullable=True),
        sa.Column("save_path", sa.String(), nullable=True),
        sa.Column("deleted", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "rssitem",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("aggregate", sa.Boolean(), nullable=False),
        sa.Column("parser", sa.String(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "torrent",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("bangumi_id", sa.Integer(), nullable=True),
        sa.Column("rss_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("homepage", sa.String(), nullable=True),
        sa.Column("downloaded", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["bangumi_id"], ["bangumi.id"], name="fk_torrent_bangumi_id_bangumi"
        ),
        sa.ForeignKeyConstraint(
            ["rss_id"], ["rssitem.id"], name="fk_torrent_rss_id_rssitem"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=20), nullable=False),
        sa.Column("password", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("torrent")
    op.drop_table("user")
    op.drop_table("rssitem")
    op.drop_table("bangumi")
