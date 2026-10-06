"""Add server-side Plex account connection."""

import sqlalchemy as sa
from alembic import op

revision = "0005_add_plex_connection"
down_revision = "0004_add_session"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "plexconnection",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_identifier", sa.String(), nullable=False),
        sa.Column("token", sa.String(), nullable=True),
        sa.Column(
            "account_reauth_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("server_token", sa.String(), nullable=True),
        sa.Column("server_identifier", sa.String(), nullable=True),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("section_id", sa.Integer(), nullable=True),
        sa.Column("path", sa.String(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("plexconnection")
