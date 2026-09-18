import pytest

ACTIONS = (
    ("enable", False, True),
    ("disable", True, False),
    ("delete", True, None),
)


def load_rss_dependencies(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "config").mkdir(exist_ok=True)

    from module.models import RSSItem
    from module.rss.engine import RSSEngine

    return RSSItem, RSSEngine


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
async def test_bulk_operations_commit_once_for_unique_ids(
    tmp_path, monkeypatch, operation, initial, expected
):
    RSSItem, RSSEngine = load_rss_dependencies(tmp_path, monkeypatch)
    async_engine = create_test_engine()
    await create_schema(async_engine)

    async with RSSEngine(async_engine) as engine:
        first = RSSItem(url="https://rss.local/first.xml", enabled=initial)
        second = RSSItem(url="https://rss.local/second.xml", enabled=initial)
        assert await engine.rss.add(first)
        assert await engine.rss.add(second)
        assert first.id is not None
        assert second.id is not None

        commit = engine.rss.session.commit
        commit_calls = 0

        async def count_commit():
            nonlocal commit_calls
            commit_calls += 1
            await commit()

        monkeypatch.setattr(engine.rss.session, "commit", count_commit)
        result = await getattr(engine, f"{operation}_list")(
            [first.id, second.id, first.id]
        )

        assert result.status is True
        assert commit_calls == 1
        updated_first = await engine.rss.search_id(first.id)
        updated_second = await engine.rss.search_id(second.id)
        if expected is None:
            assert updated_first is None
            assert updated_second is None
        else:
            assert updated_first is not None
            assert updated_second is not None
            assert updated_first.enabled is expected
            assert updated_second.enabled is expected

    await async_engine.dispose()


@pytest.mark.asyncio
@pytest.mark.parametrize(("operation", "initial", "_expected"), ACTIONS)
async def test_bulk_operations_rollback_for_missing_ids(
    tmp_path, monkeypatch, operation, initial, _expected
):
    RSSItem, RSSEngine = load_rss_dependencies(tmp_path, monkeypatch)
    async_engine = create_test_engine()
    await create_schema(async_engine)

    async with RSSEngine(async_engine) as engine:
        rss = RSSItem(url="https://rss.local/existing.xml", enabled=initial)
        assert await engine.rss.add(rss)
        assert rss.id is not None
        rss_id = rss.id

        result = await getattr(engine, f"{operation}_list")([rss_id, 999_999])

        assert result.status is False
        assert result.status_code == 406
        unchanged_rss = await engine.rss.search_id(rss_id)
        assert unchanged_rss is not None
        assert unchanged_rss.enabled is initial

    await async_engine.dispose()


@pytest.mark.asyncio
async def test_single_delete_returns_false_when_id_is_missing(tmp_path, monkeypatch):
    _, RSSEngine = load_rss_dependencies(tmp_path, monkeypatch)
    async_engine = create_test_engine()
    await create_schema(async_engine)

    async with RSSEngine(async_engine) as engine:
        assert await engine.rss.delete(999_999) is False

    await async_engine.dispose()
