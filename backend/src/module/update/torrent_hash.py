from module.database import Database
from module.service.torrent import TorrentService


async def ensure_torrent_hashes() -> None:
    async with Database() as session:
        await TorrentService(session).ensure_torrent_hashes()
