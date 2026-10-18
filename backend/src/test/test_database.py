import pytest
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel.pool import StaticPool

from module.database.bangumi import BangumiDatabase
from module.database.torrent import TorrentDatabase
from module.models import Bangumi, Torrent

# sqlite mock engine
engine = create_async_engine(
    "sqlite+aiosqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@pytest.mark.asyncio
async def test_bangumi_database():
    test_data = Bangumi(
        official_title="无职转生，到了异世界就拿出真本事",
        year="2021",
        title_raw="Mushoku Tensei",
        season=1,
        season_raw="",
        group_name="Lilith-Raws",
        dpi="1080p",
        source="Baha",
        subtitle="CHT",
        eps_collect=False,
        offset=0,
        filter="720p,\\d+-\\d+",
        poster_link="/test/test.jpg",
        added=False,
        rule_name=None,
        save_path="downloads/无职转生，到了异世界就拿出真本事/Season 1",
        deleted=False,
    )
    async with engine.begin() as connection:
        await connection.run_sync(SQLModel.metadata.create_all)
    async with AsyncSession(engine, expire_on_commit=False) as db:
        bangumi_repository = BangumiDatabase(db)
        # insert
        await bangumi_repository.add(test_data)
        assert await bangumi_repository.search_id(1) == test_data

        # update
        test_data.official_title = "无职转生，到了异世界就拿出真本事II"
        await bangumi_repository.update(test_data)
        assert await bangumi_repository.search_id(1) == test_data

        # search poster
        assert (
            await bangumi_repository.match_poster(
                "无职转生，到了异世界就拿出真本事II (2021)"
            )
            == "/test/test.jpg"
        )

        # delete
        assert await bangumi_repository.delete_one(1)
        await db.commit()
        assert await bangumi_repository.search_id(1) is None


@pytest.mark.asyncio
async def test_torrent_database():
    test_data = Torrent(
        name="[Sub Group]test S02 01 [720p].mkv",
        url="https://test.com/test.mkv",
    )
    async with AsyncSession(engine, expire_on_commit=False) as db:
        torrent_repository = TorrentDatabase(db)
        # insert
        await torrent_repository.add(test_data)
        assert await torrent_repository.search(1) == test_data

        # update
        test_data.downloaded = True
        await torrent_repository.update(test_data)
        assert await torrent_repository.search(1) == test_data

        new_torrents = await torrent_repository.check_new(
            [
                Torrent(name="Downloaded again", url=test_data.url),
                Torrent(name="New", url="https://test.com/new.mkv"),
            ]
        )
        assert [torrent.url for torrent in new_torrents] == ["https://test.com/new.mkv"]
