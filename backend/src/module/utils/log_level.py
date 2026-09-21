from loguru import logger

LEVEL_NUMBERS: dict[str, int] = {
    name: logger.level(name).no
    for name in (
        "TRACE",
        "DEBUG",
        "INFO",
        "SUCCESS",
        "WARNING",
        "ERROR",
        "CRITICAL",
    )
}
LEVEL_NAMES: dict[int, str] = {no: name for name, no in LEVEL_NUMBERS.items()}
