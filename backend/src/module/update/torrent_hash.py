from module.network import RequestContent
from module.rss import RSSEngine
from module.utils import torrent_hash


async def ensure_torrent_hashes():
    async with RSSEngine() as db:
        torrents = await db.torrent.search_all()
        missing_torrents = [
            torrent
            for torrent in torrents
            if torrent.bangumi_id is not None and not torrent.hash
        ]
        if not missing_torrents:
            return

        repaired_torrents = []
        async with RequestContent() as req:
            for torrent in missing_torrents:
                if torrent.url.startswith("magnet"):
                    info_hash = torrent_hash.from_magnet(torrent.url)
                else:
                    content = await req.get_content(torrent.url)
                    if content is None:
                        continue
                    info_hash = torrent_hash.from_torrent(content)
                if info_hash is not None:
                    torrent.hash = info_hash
                    repaired_torrents.append(torrent)

        if repaired_torrents:
            await db.torrent.update_all(repaired_torrents)
