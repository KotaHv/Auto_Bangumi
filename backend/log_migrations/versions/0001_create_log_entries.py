"""Create the structured log entries table."""

import sqlalchemy as sa
from alembic import op

revision = "0001_create_log_entries"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "log_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("timestamp", sa.BigInteger(), nullable=False),
        sa.Column("level_no", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("module", sa.String(), nullable=True),
        sa.Column("function", sa.String(), nullable=False),
        sa.Column("line", sa.Integer(), nullable=False),
        sa.Column("exception", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_log_entries_level_no_id",
        "log_entries",
        ["level_no", "id"],
    )
    op.create_index(
        "ix_log_entries_timestamp",
        "log_entries",
        ["timestamp"],
    )


def downgrade() -> None:
    op.drop_index("ix_log_entries_timestamp", table_name="log_entries")
    op.drop_index("ix_log_entries_level_no_id", table_name="log_entries")
    op.drop_table("log_entries")
