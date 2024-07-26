import time

import httpx
from loguru import logger

from module.conf import settings
from module.utils.proxy import build_proxy_url


class RequestURL:
    def __init__(self):
        self.headers = {"user-agent": "Mozilla/5.0", "Accept": "application/xml"}

    def get_url(self, url, retry=3):
        try_time = 0
        while True:
            try:
                req = self.session.get(url=url)
                logger.debug(
                    f"[Network] Successfully connected to {url}. Status: {req.status_code}"
                )
                req.raise_for_status()
                return req
            except httpx.RequestError:
                logger.debug(f"[Network] Cannot connect to {url}. Wait for 5 seconds.")
                try_time += 1
                if try_time >= retry:
                    break
                time.sleep(5)
            except Exception as e:
                logger.debug(e)
                break
        logger.error(
            f"[Network] Unable to connect to {url}, Please check your network settings"
        )
        return None

    def post_url(self, url: str, data: dict, retry=3):
        try_time = 0
        while True:
            try:
                req = self.session.post(url=url, data=data)
                req.raise_for_status()
                return req
            except httpx.RequestError:
                logger.warning(
                    f"[Network] Cannot connect to {url}. Wait for 5 seconds."
                )
                try_time += 1
                if try_time >= retry:
                    break
                time.sleep(5)
            except Exception as e:
                logger.debug(e)
                break
        logger.error(f"[Network] Failed connecting to {url}")
        logger.warning("[Network] Please check DNS/Connection settings")
        return None

    def check_url(self, url: str):
        if "://" not in url:
            url = f"http://{url}"
        try:
            req = httpx.head(url=url)
            req.raise_for_status()
            return True
        except httpx.RequestError:
            logger.debug(f"[Network] Cannot connect to {url}.")
            return False

    def post_form(self, url: str, data: dict, files):
        try:
            req = self.session.post(url=url, data=data, files=files)
            req.raise_for_status()
            return req
        except httpx.RequestError:
            logger.warning(f"[Network] Cannot connect to {url}.")
            return None

    def __enter__(self):
        proxy = build_proxy_url() if settings.proxy.enable else None
        self.session = httpx.Client(
            headers=self.headers, http2=True, proxies=proxy, timeout=5
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.session.close()
