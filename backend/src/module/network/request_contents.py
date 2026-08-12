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
    async def get_torrents(
        self,
        _url: str,
        _filter: str | None = None,
        limit: int | None = None,
        retry: int = 3,
    ) -> list[Torrent]:
        soup = await self.get_xml(_url, retry)
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

    async def get_xml(
        self, _url, retry: int = 3
    ) -> xml.etree.ElementTree.Element | None:
        req = await self.get_url(_url, retry)
        if req:
            return xml.etree.ElementTree.fromstring(req.text)

    # API JSON
    async def get_json(self, _url) -> dict | None:
        req = await self.get_url(_url)
        if req:
            return req.json()

    async def post_json(self, _url, data: dict) -> dict | None:
        req = await self.post_url(_url, data)
        if req:
            return req.json()

    async def post_data(self, _url, data: dict) -> httpx2.Response | None:
        return await self.post_url(_url, data)

    async def post_files(self, _url, data: dict, files: dict) -> httpx2.Response | None:
        return await self.post_form(_url, data, files)

    async def get_html(self, _url) -> str | None:
        req = await self.get_url(_url)
        if req:
            return req.text

    async def get_content(self, _url) -> bytes | None:
        req = await self.get_url(_url)
        if req:
            return req.content

    async def check_connection(self, _url):
        return await self.check_url(_url)

    async def get_rss_title(self, _url) -> str | None:
        soup = await self.get_xml(_url)
        if soup is not None:
            title = soup.find("./channel/title")
            if title is not None:
                return title.text

    async def get_magnet(self, _url) -> str | None:
        html = await self.get_html(_url)
        if html is None:
            return None
        root = etree.HTML(html)
        if root is None:
            return None
        magnet = root.xpath('//a[starts-with(@href, "magnet")]/@href')
        if magnet:
            return magnet[0]

    async def get_torrent_or_magnet(self, torrent: Torrent) -> bytes | str | None:
        content = await self.get_content(torrent.url)
        if content is None:
            return None
        if check_torrent(content):
            return content
        if torrent.homepage:
            magnet = await self.get_magnet(torrent.homepage)
            if magnet:
                return magnet
        return
