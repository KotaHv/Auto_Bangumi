"""Add server-managed authentication sessions."""

import sqlalchemy as sa
from alembic import op

revision = "0004_add_session"
down_revision = "0003_remove_rss_foreign_key"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "session",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )


def downgrade():
    op.drop_table("session")
