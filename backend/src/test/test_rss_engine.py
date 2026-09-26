import pytest
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from module.service.rss import RssService

from .test_database import engine as e


@pytest.mark.asyncio
async def test_rss_service_pull_rss():
    async with e.begin() as connection:
        await connection.run_sync(SQLModel.metadata.create_all)

    rss_link = "https://mikanani.me/RSS/Bangumi?bangumiId=2353&subgroupid=552"
    async with AsyncSession(e, expire_on_commit=False) as session:
        service = RssService(session)
        await service.add_rss(rss_link, aggregate=False)
        result = await service.rss.search_active()
        rss_item = next(item for item in result if item.url == rss_link)
        assert rss_item.name == "Mikan Project - 无职转生～到了异世界就拿出真本事～"

        new_torrents = await service.pull_rss(rss_item)
        torrent = new_torrents[0]
        assert (
            torrent.name
            == "[Lilith-Raws] 无职转生，到了异世界就拿出真本事 / Mushoku Tensei - 11 [Baha][WEB-DL][1080p][AVC AAC][CHT][MP4]"
        )
        assert torrent.rss_id == rss_item.id
