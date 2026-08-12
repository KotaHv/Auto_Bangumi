import pytest
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.pool import StaticPool

from module.database.combine import Database
from module.models import Bangumi, RSSItem, Torrent

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
        rss_link="test",
        poster_link="/test/test.jpg",
        added=False,
        rule_name=None,
        save_path="downloads/无职转生，到了异世界就拿出真本事/Season 1",
        deleted=False,
    )
    async with Database(engine) as db:
        await db.create_table()
        # insert
        await db.bangumi.add(test_data)
        assert await db.bangumi.search_id(1) == test_data

        # update
        test_data.official_title = "无职转生，到了异世界就拿出真本事II"
        await db.bangumi.update(test_data)
        assert await db.bangumi.search_id(1) == test_data

        # search poster
        assert (
            await db.bangumi.match_poster("无职转生，到了异世界就拿出真本事II (2021)")
            == "/test/test.jpg"
        )

        # match torrent
        result = await db.bangumi.match_torrent(
            "[Lilith-Raws] 无职转生，到了异世界就拿出真本事 / Mushoku Tensei - 11 [Baha][WEB-DL][1080p][AVC AAC][CHT][MP4]"
        )
        assert result is not None
        assert result.official_title == "无职转生，到了异世界就拿出真本事II"

        # delete
        await db.bangumi.delete_one(1)
        assert await db.bangumi.search_id(1) is None


@pytest.mark.asyncio
async def test_torrent_database():
    test_data = Torrent(
        name="[Sub Group]test S02 01 [720p].mkv",
        url="https://test.com/test.mkv",
    )
    async with Database(engine) as db:
        # insert
        await db.torrent.add(test_data)
        assert await db.torrent.search(1) == test_data

        # update
        test_data.downloaded = True
        await db.torrent.update(test_data)
        assert await db.torrent.search(1) == test_data


@pytest.mark.asyncio
async def test_rss_database():
    rss_url = "https://test.com/test.xml"

    async with Database(engine) as db:
        await db.rss.add(RSSItem(url=rss_url))
