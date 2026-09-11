from pathlib import Path

from module.conf import settings
from module.downloader import DownloadClient
from module.models import Config


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
