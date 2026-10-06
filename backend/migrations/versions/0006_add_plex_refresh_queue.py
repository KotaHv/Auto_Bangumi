"""Add durable Plex refresh queue."""

import sqlalchemy as sa
from alembic import op

revision = "0006_add_plex_refresh_queue"
down_revision = "0005_add_plex_connection"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "plexrefreshjob",
        sa.Column("path", sa.String(), nullable=False),
        sa.Column("revision", sa.String(), nullable=False),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.Column("updated_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("path"),
    )


def downgrade():
    op.drop_table("plexrefreshjob")
