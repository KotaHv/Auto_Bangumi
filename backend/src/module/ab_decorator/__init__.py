import threading

from loguru import logger

lock = threading.Lock()


def api_failed(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.debug(f"URL: {args[0]}")
            logger.warning("Wrong API response.")
            logger.debug(e)

    return wrapper


def locked(func):
    def wrapper(*args, **kwargs):
        with lock:
            return func(*args, **kwargs)

    return wrapper
