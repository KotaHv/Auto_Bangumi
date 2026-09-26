from module.database.factory import session_factory
from module.service.torrent import TorrentService


async def ensure_torrent_hashes() -> None:
    async with session_factory() as session:
        await TorrentService(session).ensure_torrent_hashes()
