import pytest

ACTIONS = (
    ("enable", False, True),
    ("disable", True, False),
    ("delete", True, None),
)


def load_rss_dependencies(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "config").mkdir(exist_ok=True)

    from module.database.combine import Database
    from module.models import RSSItem
    from module.rss.engine import RSSEngine
    from module.service.rss import RssService

    return RSSItem, RSSEngine, Database, RssService


def create_test_engine():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlmodel.pool import StaticPool

    return create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


async def create_schema(async_engine):
    from sqlmodel import SQLModel

    async with async_engine.begin() as connection:
        await connection.run_sync(SQLModel.metadata.create_all)


@pytest.mark.asyncio
@pytest.mark.parametrize(("operation", "initial", "expected"), ACTIONS)
async def test_bulk_operations_update_all_unique_ids(
    tmp_path, monkeypatch, operation, initial, expected
):
    RSSItem, RSSEngine, Database, RssService = load_rss_dependencies(
        tmp_path, monkeypatch
    )
    async_engine = create_test_engine()
    await create_schema(async_engine)

    async with RSSEngine(async_engine) as engine:
        items = [
            RSSItem(url=f"https://rss.local/{name}.xml", enabled=initial)
            for name in ("first", "second")
        ]
        for item in items:
            assert await engine.rss.add(item)
            assert item.id is not None
        item_ids = [item.id for item in items]
        assert all(item_id is not None for item_id in item_ids)
        first_id, second_id = item_ids
        assert first_id is not None and second_id is not None

        if operation == "delete":
            async with Database(async_engine) as session:
                result = await RssService(session).delete_many(
                    [first_id, second_id, first_id]
                )
        else:
            result = await getattr(engine, f"{operation}_list")(
                [first_id, second_id, first_id]
            )

        assert result.status
        for item_id in (first_id, second_id):
            if expected is None:
                async with Database(async_engine) as check:
                    assert await check.rss.search_id(item_id) is None
            else:
                stored = await engine.rss.search_id(item_id)
                assert stored is not None
                assert stored.enabled is expected

    await async_engine.dispose()


@pytest.mark.asyncio
@pytest.mark.parametrize(("operation", "initial", "_expected"), ACTIONS)
async def test_bulk_operation_with_missing_id_changes_nothing(
    tmp_path, monkeypatch, operation, initial, _expected
):
    RSSItem, RSSEngine, Database, RssService = load_rss_dependencies(
        tmp_path, monkeypatch
    )
    async_engine = create_test_engine()
    await create_schema(async_engine)

    async with RSSEngine(async_engine) as engine:
        rss = RSSItem(url="https://rss.local/existing.xml", enabled=initial)
        assert await engine.rss.add(rss)
        assert rss.id is not None
        rss_id = rss.id

        if operation == "delete":
            async with Database(async_engine) as session:
                result = await RssService(session).delete_many([rss_id, 999_999])
        else:
            result = await getattr(engine, f"{operation}_list")([rss_id, 999_999])

        assert result.status is False
        assert result.status_code == 406
        unchanged = await engine.rss.search_id(rss_id)
        assert unchanged is not None
        assert unchanged.enabled is initial

    await async_engine.dispose()
