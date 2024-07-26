import logging
import sys
from pathlib import Path

from loguru import logger

from .config import settings

LOG_ROOT = Path("data")
LOG_PATH = LOG_ROOT / "log.txt"


def setup_logger(level: int = logging.INFO, reset: bool = False):
    if reset and LOG_PATH.exists():
        LOG_PATH.unlink(missing_ok=True)
    level = logging.DEBUG if settings.log.debug_enable else level
    logger.remove()
    logger.add(sys.stderr, level=level)
    logger.add(LOG_PATH, level=level)
