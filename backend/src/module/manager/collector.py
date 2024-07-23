import logging

from module.downloader import DownloadClient
from module.models import Bangumi, ResponseModel
from module.rss import RSSEngine
from module.searcher import SEARCH_KEY, SearchTorrent
from module.utils.multi_version_filter import filter_multi_version_torrents

logger = logging.getLogger(__name__)


class SeasonCollector(DownloadClient):
    def collect_season(self, bangumi: Bangumi, link: str = None):
        logger.info(
            f"Start collecting {bangumi.official_title} Season {bangumi.season}..."
        )
        with SearchTorrent() as st, RSSEngine() as engine:
            if not link:
                torrents = st.search_season(bangumi)
            else:
                torrents = st.get_torrents(link, bangumi.filter.replace(",", "|"))
            filter_multi_version_torrents(torrents)
            if self.add_torrent(torrents, bangumi):
                logger.info(
                    f"Collections of {bangumi.official_title} Season {bangumi.season} completed."
                )
                bangumi.eps_collect = True
                if engine.bangumi.update(bangumi):
                    engine.bangumi.add(bangumi)
                engine.torrent.add_all(torrents)
                return ResponseModel(
                    status=True,
                    status_code=200,
                    msg_en=f"Collections of {bangumi.official_title} Season {bangumi.season} completed.",
                    msg_zh=f"收集 {bangumi.official_title} 第 {bangumi.season} 季完成。",
                )
            else:
                logger.warning(
                    f"Already collected {bangumi.official_title} Season {bangumi.season}."
                )
                return ResponseModel(
                    status=False,
                    status_code=406,
                    msg_en=f"Collection of {bangumi.official_title} Season {bangumi.season} failed.",
                    msg_zh=f"收集 {bangumi.official_title} 第 {bangumi.season} 季失败, 种子已经添加。",
                )

    def subscribe_season(self, data: Bangumi, parser: str = "mikan"):
        with RSSEngine() as engine:
            data.added = True
            data.eps_collect = True
            with SearchTorrent() as st:
                torrents = st.get_torrents(data.rss_link, data.filter.replace(",", "|"))
                for torrent in torrents:
                    bangumi = st.raw_parser(raw=torrent.name)
                    if bangumi:
                        for filed in SEARCH_KEY:
                            setattr(data, filed, getattr(bangumi, filed))
                        break
            filter_multi_version_torrents(torrents)
            engine.add_rss(
                rss_link=data.rss_link,
                name=data.official_title,
                aggregate=False,
                parser=parser,
            )
            engine.bangumi.add(data)
            if torrents:
                rss_item = engine.rss.search_url(data.rss_link)
                for torrent in torrents:
                    torrent.rss_id = rss_item.id
                self.add_torrent(torrents, data)
                engine.torrent.add_all(torrents)
                return ResponseModel(
                    status=True,
                    status_code=200,
                    msg_en=f"[Engine] Download {data.official_title} successfully.",
                    msg_zh=f"下载 {data.official_title} 成功。",
                )
            else:
                return ResponseModel(
                    status=False,
                    status_code=406,
                    msg_en=f"[Engine] Download {data.official_title} failed.",
                    msg_zh=f"[Engine] 下载 {data.official_title} 失败。",
                )

    def force_collect(self, bangumi: Bangumi):
        rss_links = filter(None, bangumi.rss_link.split(","))
        rss_link_to_collect = None

        with RSSEngine() as engine:
            for rss_link in rss_links:
                rss = engine.rss.search_url(rss_link)
                if rss is None:
                    continue
                if rss.aggregate:
                    rss_link_to_collect = None
                    break
                else:
                    rss_link_to_collect = rss_link
                    break
            else:
                return ResponseModel(
                    status=False,
                    status_code=406,
                    msg_en=f"Collection of {bangumi.official_title} Season {bangumi.season} failed, no valid rss found.",
                    msg_zh=f"收集 {bangumi.official_title} 第 {bangumi.season} 季失败, 未找到有效rss。",
                )
        return self.collect_season(bangumi, rss_link_to_collect)


def eps_complete():
    with RSSEngine() as engine:
        datas = engine.bangumi.not_complete()
        if datas:
            logger.info("Start collecting full season...")
            for data in datas:
                if not data.eps_collect:
                    with SeasonCollector() as collector:
                        collector.collect_season(data)
                data.eps_collect = True
            engine.bangumi.update_all(datas)
