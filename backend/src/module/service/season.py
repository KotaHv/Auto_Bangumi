from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from module.database.bangumi import BangumiDatabase
from module.database.rss import RSSDatabase
from module.database.torrent import TorrentDatabase
from module.downloader import DownloadClient
from module.models import Bangumi, ResponseModel, RSSItem
from module.searcher import SEARCH_KEY, SearchTorrent
from module.service._locks import rss_operation_lock
from module.utils.multi_version_filter import filter_multi_version_torrents
from module.utils.torrent_tags import RENAME_TAG, format_offset_tag


class SeasonService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.bangumi = BangumiDatabase(session)
        self.rss = RSSDatabase(session)
        self.torrent = TorrentDatabase(session)

    async def collect_season(self, bangumi: Bangumi, link: str) -> ResponseModel:
        logger.info(
            "Start collecting {} Season {}...", bangumi.official_title, bangumi.season
        )
        title = bangumi.official_title
        season = bangumi.season
        async with SearchTorrent() as st, DownloadClient() as client:
            torrents = await st.get_torrents(link, bangumi.filter.replace(",", "|"))
            filter_multi_version_torrents(torrents)
            offset_tag = format_offset_tag(bangumi.offset)
            tags = [RENAME_TAG, offset_tag] if offset_tag else None
            if await client.add_torrent(torrents, bangumi, tags=tags):
                logger.info("Collections of {} Season {} completed.", title, season)
                return ResponseModel(
                    status=True,
                    status_code=200,
                    msg_en=f"Collections of {title} Season {season} completed.",
                    msg_zh=f"收集 {title} 第 {season} 季完成。",
                )
            logger.warning("Already collected {} Season {}.", title, season)
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en=f"Collection of {title} Season {season} failed.",
                msg_zh=f"收集 {title} 第 {season} 季失败, 种子已经添加。",
            )

    async def subscribe_season(
        self, data: Bangumi, parser: str = "mikan"
    ) -> ResponseModel:
        async with SearchTorrent() as st, DownloadClient() as client:
            data.added = True
            data.eps_collect = True
            torrents = await st.get_torrents(
                data.rss_link, data.filter.replace(",", "|")
            )
            for torrent in torrents:
                bangumi = await st.raw_parser(raw=torrent.name)
                if bangumi:
                    for field in SEARCH_KEY:
                        setattr(data, field, getattr(bangumi, field))
                    break
            filter_multi_version_torrents(torrents)
            await self.rss.add(
                RSSItem(
                    url=data.rss_link,
                    name=data.official_title,
                    aggregate=False,
                    parser=parser,
                )
            )
            await self.bangumi.add(data)
            await self.session.commit()
            if torrents:
                rss_item = await self.rss.search_url(data.rss_link)
                if rss_item is None:
                    return ResponseModel(
                        status=False,
                        status_code=406,
                        msg_en=f"[Engine] RSS {data.rss_link} not found.",
                        msg_zh=f"[Engine] 未找到 RSS {data.rss_link}。",
                    )
                for torrent in torrents:
                    torrent.rss_id = rss_item.id
                await client.add_torrent(torrents, data)
                await self.torrent.add_all(torrents)
                await self.session.commit()
                return ResponseModel(
                    status=True,
                    status_code=200,
                    msg_en=f"[Engine] Download {data.official_title} successfully.",
                    msg_zh=f"下载 {data.official_title} 成功。",
                )
            return ResponseModel(
                status=False,
                status_code=406,
                msg_en=f"[Engine] Download {data.official_title} failed.",
                msg_zh=f"[Engine] 下载 {data.official_title} 失败。",
            )

    async def force_collect(self, bangumi: Bangumi) -> ResponseModel:
        logger.info(
            "Force collecting {} Season {}...", bangumi.official_title, bangumi.season
        )
        rss_links = filter(None, bangumi.rss_link.split(","))

        async with SearchTorrent() as st, DownloadClient() as client:
            for rss_link in rss_links:
                rss = await self.rss.search_url(rss_link)
                if rss is None:
                    continue
                if rss.aggregate:
                    torrents = await st.search_season(bangumi)
                    break
                torrents = await st.get_torrents(
                    rss_link, bangumi.filter.replace(",", "|")
                )
                break
            else:
                return ResponseModel(
                    status=False,
                    status_code=406,
                    msg_en=f"Collection of {bangumi.official_title} Season {bangumi.season} failed, no valid rss found.",
                    msg_zh=f"收集 {bangumi.official_title} 第 {bangumi.season} 季失败, 未找到有效rss。",
                )
            filter_multi_version_torrents(torrents)
            await client.add_torrent(torrents, bangumi)
            logger.info(
                "Collections of {} Season {} completed.",
                bangumi.official_title,
                bangumi.season,
            )
            await self.torrent.add_all(torrents)
            await self.session.commit()
            return ResponseModel(
                status=True,
                status_code=200,
                msg_en=f"Collections of {bangumi.official_title} Season {bangumi.season} completed.",
                msg_zh=f"收集 {bangumi.official_title} 第 {bangumi.season} 季完成。",
            )

    async def collect_incomplete(self) -> None:
        async with rss_operation_lock:
            datas = await self.bangumi.not_complete()
            if not datas:
                return
            logger.info("Start collecting full season...")
            try:
                async with SearchTorrent() as st, DownloadClient() as client:
                    for data in datas:
                        torrents = await st.search_season(data)
                        filter_multi_version_torrents(torrents)
                        if not await client.add_torrent(torrents, data):
                            continue
                        data.eps_collect = True
                        self.session.add(data)
                        await self.torrent.add_all(torrents)
                        await self.session.commit()
                        logger.info(
                            "Collections of {} Season {} completed.",
                            data.official_title,
                            data.season,
                        )
            except Exception:
                await self.session.rollback()
                raise
