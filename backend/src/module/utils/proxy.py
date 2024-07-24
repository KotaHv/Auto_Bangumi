import logging

from module.conf import settings

logger = logging.getLogger(__name__)


def build_proxy_url():
    if settings.proxy.type in ["http", "https", "socks5"]:
        proxy_type = settings.proxy.type
    else:
        proxy_type = None
    auth = (
        f"{settings.proxy.username}:{settings.proxy.password}@"
        if settings.proxy.username
        else ""
    )

    if proxy_type is None:
        logger.error(f"[Network] Unsupported proxy type: {settings.proxy.type}")
        return None

    return f"{proxy_type}://{auth}{settings.proxy.host}:{settings.proxy.port}"
