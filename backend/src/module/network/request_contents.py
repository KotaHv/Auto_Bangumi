import re
import xml.etree.ElementTree

import httpx2
import lxml.etree as etree
from loguru import logger

from module.conf import settings
from module.models import Torrent
from module.utils import check_torrent

from .request_url import RequestURL
from .site import rss_parser


class RequestContent(RequestURL):
    def get_torrents(
        self,
        _url: str,
        _filter: str | None = None,
        limit: int | None = None,
        retry: int = 3,
    ) -> list[Torrent]:
        soup = self.get_xml(_url, retry)
        if soup is not None:
            torrent_titles, torrent_urls, torrent_homepage = rss_parser(soup)
            torrents: list[Torrent] = []
            if _filter is None:
                _filter = "|".join(settings.rss_parser.filter)
            for _title, torrent_url, homepage in zip(
                torrent_titles, torrent_urls, torrent_homepage, strict=True
            ):
                if re.search(_filter, _title) is None:
                    torrents.append(
                        Torrent(name=_title, url=torrent_url, homepage=homepage)
                    )
                if isinstance(limit, int):
                    if len(torrents) >= limit:
                        break
            return torrents
        else:
            logger.warning(f"[Network] Failed to get torrents: {_url}")
            return []

    def get_xml(self, _url, retry: int = 3) -> xml.etree.ElementTree.Element | None:
        req = self.get_url(_url, retry)
        if req:
            return xml.etree.ElementTree.fromstring(req.text)

    # API JSON
    def get_json(self, _url) -> dict | None:
        req = self.get_url(_url)
        if req:
            return req.json()

    def post_json(self, _url, data: dict) -> dict | None:
        req = self.post_url(_url, data)
        if req:
            return req.json()

    def post_data(self, _url, data: dict) -> httpx2.Response | None:
        return self.post_url(_url, data)

    def post_files(self, _url, data: dict, files: dict) -> httpx2.Response | None:
        return self.post_form(_url, data, files)

    def get_html(self, _url) -> str | None:
        req = self.get_url(_url)
        if req:
            return req.text

    def get_content(self, _url) -> bytes | None:
        req = self.get_url(_url)
        if req:
            return req.content

    def check_connection(self, _url):
        return self.check_url(_url)

    def get_rss_title(self, _url) -> str | None:
        soup = self.get_xml(_url)
        if soup is not None:
            title = soup.find("./channel/title")
            if title is not None:
                return title.text

    def get_magnet(self, _url) -> str | None:
        html = self.get_html(_url)
        if html is None:
            return None
        root = etree.HTML(html)
        if root is None:
            return None
        magnet = root.xpath('//a[starts-with(@href, "magnet")]/@href')
        if magnet:
            return magnet[0]

    def get_torrent_or_magnet(self, torrent: Torrent) -> bytes | str | None:
        content = self.get_content(torrent.url)
        if content is None:
            return None
        if check_torrent(content):
            return content
        if torrent.homepage:
            magnet = self.get_magnet(torrent.homepage)
            if magnet:
                return magnet
        return
