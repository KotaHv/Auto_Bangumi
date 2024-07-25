import logging
from pathlib import Path

from .config import settings

LOG_ROOT = Path("data")
LOG_PATH = LOG_ROOT / "log.txt"


def setup_logger(level: int = logging.INFO, reset: bool = False):
    level = logging.DEBUG if settings.log.debug_enable else level
    LOG_ROOT.mkdir(exist_ok=True)

    if reset and LOG_PATH.exists():
        LOG_PATH.unlink(missing_ok=True)

    logging.addLevelName(logging.DEBUG, "DEBUG:")
    logging.addLevelName(logging.INFO, "INFO:")
    logging.addLevelName(logging.WARNING, "WARNING:")
    logging.addLevelName(logging.ERROR, "ERROR:")
    if level == logging.DEBUG:
        LOGGING_FORMAT = "[%(asctime)s] [%(name)s] %(levelname)s  %(message)s"
    else:
        LOGGING_FORMAT = "[%(asctime)s] %(levelname)-8s  %(message)s"
    TIME_FORMAT = "%Y-%m-%d %H:%M:%S"
    logger = logging.getLogger()
    if logger.hasHandlers():
        logger.handlers.clear()
    logging.basicConfig(
        level=logging.WARNING,
        format=LOGGING_FORMAT,
        datefmt=TIME_FORMAT,
        encoding="utf-8",
        handlers=[
            logging.FileHandler(LOG_PATH, encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )
    logging.getLogger("module").setLevel(level)
