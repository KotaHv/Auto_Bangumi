import logging
import sys
import traceback

import loguru
from loguru import logger

from module.database.log import LogDatabase
from module.models.log import LogEntry
from module.utils.log_time import to_microseconds

TRACEBACK_EXTRA_KEY = "formatted_traceback"
SKIP_DATABASE_EXTRA_KEY = "skip_database"


def _patch_record(record: loguru.Record) -> None:
    # Patchers run in the producer thread, before the record is pickled into
    # the ``enqueue=True`` queue. RecordException.__reduce__ drops the
    # traceback during that pickling, so the consumer sink would only see the
    # exception type and message. Materializing the full stack here, into
    # ``extra``, is what preserves tracebacks for the SQLite sink; do not
    # replace this with reading record["exception"] inside _write_structured_log.
    exception = record["exception"]
    if exception is None or exception.value is None:
        return
    record["extra"][TRACEBACK_EXTRA_KEY] = "".join(
        traceback.format_exception(
            exception.type,
            exception.value,
            exception.traceback,
        )
    ).rstrip()


def is_module_logger(name: str | None) -> bool:
    return name is not None and (name == "module" or name.startswith("module."))


def allows_log(name: str | None, level_no: int) -> bool:
    return level_no != logging.DEBUG or is_module_logger(name)


def skip_database_log() -> loguru.Logger:
    return logger.bind(**{SKIP_DATABASE_EXTRA_KEY: True})


def _should_log_to_stderr(record: loguru.Record) -> bool:
    return allows_log(record["name"], record["level"].no)


def _should_log_to_database(record: loguru.Record) -> bool:
    return not record["extra"].get(SKIP_DATABASE_EXTRA_KEY, False) and allows_log(
        record["name"], record["level"].no
    )


class InterceptHandler(logging.Handler):
    """Route stdlib logging records (e.g. uvicorn) into loguru."""

    def emit(self, record: logging.LogRecord) -> None:
        if not allows_log(record.name, record.levelno):
            return

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


class LoggerManager:
    def __init__(self, database: LogDatabase | None = None) -> None:
        self.database = database if database is not None else LogDatabase()

    def _write_structured_log(self, message: loguru.Message) -> None:
        record = message.record
        try:
            entry = LogEntry(
                timestamp=to_microseconds(record["time"]),
                level_no=record["level"].no,
                message=record["message"],
                module=record["name"],
                function=record["function"],
                line=record["line"],
                # Set by _patch_record in the producer thread; the consumer's
                # record["exception"].traceback is None after enqueue pickling.
                exception=record["extra"].get(TRACEBACK_EXTRA_KEY),
            )
            self.database.add(entry)
        except Exception as error:
            print(f"Structured log write failed: {error}", file=sys.stderr)

    def setup(self, *, debug_enabled: bool) -> None:
        level = "DEBUG" if debug_enabled else "INFO"

        logger.configure(patcher=_patch_record)
        logger.remove()

        logger.add(
            sys.stderr,
            level=level,
            filter=_should_log_to_stderr,
        )
        logger.add(
            self._write_structured_log,
            level=level,
            filter=_should_log_to_database,
            enqueue=True,
        )

        logging.basicConfig(
            handlers=[InterceptHandler()], level=logging.INFO, force=True
        )
        logging.getLogger("module").setLevel(
            logging.DEBUG if debug_enabled else logging.INFO
        )
        logging.getLogger("urllib3").setLevel(logging.ERROR)
        logging.getLogger("httpx2").setLevel(logging.WARNING)
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    async def shutdown(self) -> None:
        await logger.complete()
        logger.remove()
        self.database.dispose()
