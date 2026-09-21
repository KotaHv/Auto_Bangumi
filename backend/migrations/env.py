import os

from alembic import context
from sqlalchemy import create_engine, pool
from sqlmodel import SQLModel

import module.models  # noqa: F401

config = context.config
target_metadata = SQLModel.metadata


def _database_url():
    url = os.environ.get(
        "AUTOBANGUMI_ALEMBIC_DATABASE_URL",
        config.get_alembic_option("sqlalchemy_url"),
    )
    if url is None:
        raise RuntimeError("sqlalchemy_url is required for the Alembic CLI")
    return url.replace("+aiosqlite", "")


def run_migrations_offline():
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connection = config.attributes.get("connection")
    if connection is not None:
        do_run_migrations(connection)
        return

    connectable = create_engine(_database_url(), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        do_run_migrations(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
