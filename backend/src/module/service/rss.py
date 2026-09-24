from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.bangumi import BangumiDatabase
from module.database.rss import RSSDatabase
from module.database.torrent import TorrentDatabase
from module.models import ResponseModel


class RssService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.rss = RSSDatabase(session)
        self.bangumi = BangumiDatabase(session)
        self.torrent = TorrentDatabase(session)

    async def _delete_rss_and_cleanup_bangumi(self, rss_id: int) -> bool:
        rss_item = await self.rss.search_id(rss_id)
        if rss_item is None:
            return False

        for bangumi in await self.bangumi.search_rss(rss_item.url):
            members = [
                member
                for member in (bangumi.rss_link or "").split(",")
                if member and member != rss_item.url
            ]
            if members:
                self.bangumi.set_rss_link(bangumi, ",".join(members))
            elif bangumi.id is not None:
                await self.torrent.delete_by_bangumi_id(bangumi.id)
                if not await self.bangumi.delete_one(bangumi.id):
                    raise ValueError(
                        f"Bangumi rule {bangumi.id} disappeared during deletion"
                    )

        return await self.rss.delete_one(rss_id)

    async def delete_one(self, rss_id: int) -> ResponseModel:
        return await self.delete_many([rss_id])

    async def delete_many(self, rss_ids: list[int]) -> ResponseModel:
        try:
            for rss_id in set(rss_ids):
                if not await self._delete_rss_and_cleanup_bangumi(rss_id):
                    raise ValueError(f"RSS item {rss_id} does not exist")
            await self.session.commit()
        except Exception as e:
            await self.session.rollback()
            logger.error("Delete RSS Items failed. Because: {}", e)
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en="Delete RSS failed.",
                msg_zh="删除 RSS 失败。",
            )
        return ResponseModel(
            status=True,
            status_code=200,
            msg_en="Delete RSS successfully.",
            msg_zh="删除 RSS 成功。",
        )
