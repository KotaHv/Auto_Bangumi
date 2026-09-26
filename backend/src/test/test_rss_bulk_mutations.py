import pytest
from sqlmodel.ext.asyncio.session import AsyncSession

ACTIONS = (
    ("enable", False, True),
    ("disable", True, False),
    ("delete", True, None),
)


def load_rss_dependencies(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "config").mkdir(exist_ok=True)

    from module.database.rss import RSSDatabase
    from module.models import RSSItem
    from module.service.rss import RssService

    return RSSItem, RSSDatabase, RssService


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
    RSSItem, RSSDatabase, RssService = load_rss_dependencies(tmp_path, monkeypatch)
    async_engine = create_test_engine()
    await create_schema(async_engine)

    async with AsyncSession(async_engine, expire_on_commit=False) as db:
        rss_repository = RSSDatabase(db)
        items = [
            RSSItem(url=f"https://rss.local/{name}.xml", enabled=initial)
            for name in ("first", "second")
        ]
        for item in items:
            assert await rss_repository.add(item)
            await db.commit()
            assert item.id is not None
        item_ids = [item.id for item in items]
        assert all(item_id is not None for item_id in item_ids)
        first_id, second_id = item_ids
        assert first_id is not None and second_id is not None

        async with AsyncSession(async_engine, expire_on_commit=False) as session:
            service = RssService(session)
            if operation == "delete":
                result = await service.delete_many([first_id, second_id, first_id])
            else:
                result = await service.set_enabled_many(
                    [first_id, second_id, first_id], enabled=operation == "enable"
                )

        assert result.status
        for item_id in (first_id, second_id):
            if expected is None:
                async with AsyncSession(async_engine, expire_on_commit=False) as check:
                    check_rss = RSSDatabase(check)
                    assert await check_rss.search_id(item_id) is None
            else:
                async with AsyncSession(async_engine, expire_on_commit=False) as check:
                    check_rss = RSSDatabase(check)
                    stored = await check_rss.search_id(item_id)
                    assert stored is not None
                    assert stored.enabled is expected

    await async_engine.dispose()


@pytest.mark.asyncio
@pytest.mark.parametrize(("operation", "initial", "_expected"), ACTIONS)
async def test_bulk_operation_with_missing_id_changes_nothing(
    tmp_path, monkeypatch, operation, initial, _expected
):
    RSSItem, RSSDatabase, RssService = load_rss_dependencies(tmp_path, monkeypatch)
    async_engine = create_test_engine()
    await create_schema(async_engine)

    async with AsyncSession(async_engine, expire_on_commit=False) as db:
        rss_repository = RSSDatabase(db)
        rss = RSSItem(url="https://rss.local/existing.xml", enabled=initial)
        assert await rss_repository.add(rss)
        await db.commit()
        assert rss.id is not None
        rss_id = rss.id

        async with AsyncSession(async_engine, expire_on_commit=False) as session:
            service = RssService(session)
            if operation == "delete":
                result = await service.delete_many([rss_id, 999_999])
            else:
                result = await service.set_enabled_many(
                    [rss_id, 999_999], enabled=operation == "enable"
                )

        assert result.status is False
        assert result.status_code == 406
        unchanged = await rss_repository.search_id(rss_id)
        assert unchanged is not None
        assert unchanged.enabled is initial

    await async_engine.dispose()
