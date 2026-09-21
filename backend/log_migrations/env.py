"""Programmatic migration entry point for the structured log database.

There is no Alembic CLI or ini file for ``log_migrations``: ``[tool.alembic]``
in ``pyproject.toml`` points at ``migrations/`` for the business database, and
``LogDatabase`` drives this tree through ``upgrade_schema()`` with an explicit
connection. Only the online/injected-connection path is therefore implemented
and reachable.
"""

from alembic import context
from sqlalchemy import Connection

from module.models.log import LOG_METADATA

config = context.config
target_metadata = LOG_METADATA


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


connection = config.attributes.get("connection")
if connection is None:
    raise RuntimeError(
        "log_migrations must be run through module.database.log.LogDatabase"
    )
do_run_migrations(connection)
