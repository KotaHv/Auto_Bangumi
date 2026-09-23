from .config import VERSION, settings
from .const import (
    DATA_PATH,
    LOG_DATABASE_PATH,
    POSTERS_PATH,
    TMDB_API,
)
from .search_provider import SEARCH_CONFIG

PLATFORM = "Windows" if "\\" in settings.downloader.path else "Unix"

__all__ = [
    "VERSION",
    "settings",
    "LOG_DATABASE_PATH",
    "SEARCH_CONFIG",
    "TMDB_API",
    "DATA_PATH",
    "POSTERS_PATH",
    "PLATFORM",
]
