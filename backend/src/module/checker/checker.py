from pathlib import Path

from sqlalchemy import text
from sqlmodel import select

from module.conf import settings
from module.database import Database
from module.downloader import DownloadClient
from module.models import Config, Torrent


class Checker:
    def __init__(self):
        pass

    @staticmethod
    def check_renamer() -> bool:
        if settings.bangumi_manage.enable:
            return True
        else:
            return False

    @staticmethod
    def check_analyser() -> bool:
        if settings.rss_parser.enable:
            return True
        else:
            return False

    @staticmethod
    def check_first_run() -> bool:
        if settings.model_dump() == Config().model_dump():
            return True
        else:
            return False

    @staticmethod
    def check_database() -> bool:
        db_path = Path("data/data.db")
        if not db_path.exists():
            return False
        else:
            return True

    @staticmethod
    async def check_downloader() -> bool:
        try:
            async with DownloadClient() as client:
                return client.authed
        except Exception:
            return False

    @staticmethod
    def check_img_cache() -> bool:
        img_path = Path("data/posters")
        if img_path.exists():
            return True
        else:
            img_path.mkdir()
            return False

    @staticmethod
    async def check_torrent_hash() -> bool:
        async with Database() as db:
            columns = (
                (
                    # sqlmodel exec() overloads don't accept TextClause, but it works at runtime
                    await db.exec(text("PRAGMA table_info(torrent)"))  # type: ignore[reportCallIssue, reportArgumentType]
                )
                .mappings()
                .all()
            )
            if not any(column["name"] == "hash" for column in columns):
                return False
            torrents = (await db.exec(select(Torrent))).all()
            return not any(
                torrent.hash is None and torrent.bangumi_id for torrent in torrents
            )
