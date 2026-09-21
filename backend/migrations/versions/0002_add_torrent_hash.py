"""Add the nullable torrent hash column."""

import sqlalchemy as sa
from alembic import op

revision = "0002_add_torrent_hash"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("torrent", sa.Column("hash", sa.String(), nullable=True))


def downgrade():
    with op.batch_alter_table("torrent", recreate="always") as batch_op:
        batch_op.drop_column("hash")
