import logging
import sys
from pathlib import Path

from loguru import logger

from .config import settings

LOG_ROOT = Path("data")
LOG_PATH = LOG_ROOT / "log.txt"


class InterceptHandler(logging.Handler):
    """Route stdlib logging records (e.g. uvicorn) into loguru."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        # Skip the logging-module frames so loguru reports the original caller.
        frame, depth = logging.currentframe(), 1
        if frame:
            frame = frame.f_back
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1
        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logger(level: str = "INFO", reset: bool = False):
    if reset and LOG_PATH.exists():
        LOG_PATH.unlink(missing_ok=True)
    if settings.log.debug_enable:
        level = "DEBUG"
    logger.remove()
    logger.add(sys.stderr, level=level)
    logger.add(LOG_PATH, level=level)
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
