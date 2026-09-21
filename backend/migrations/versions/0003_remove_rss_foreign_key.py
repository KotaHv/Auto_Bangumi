"""Remove the RSS foreign key while retaining its source ID."""

from alembic import op

revision = "0003_remove_rss_foreign_key"
down_revision = "0002_add_torrent_hash"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table(
        "torrent",
        recreate="always",
        naming_convention={
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"
        },
    ) as batch_op:
        batch_op.drop_constraint("fk_torrent_rss_id_rssitem", type_="foreignkey")


def downgrade():
    with op.batch_alter_table(
        "torrent",
        recreate="always",
        naming_convention={
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"
        },
    ) as batch_op:
        batch_op.create_foreign_key(
            "fk_torrent_rss_id_rssitem", "rssitem", ["rss_id"], ["id"]
        )
