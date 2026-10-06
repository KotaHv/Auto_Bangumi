import xml.etree.ElementTree as ET

import httpx2
from loguru import logger
from pydantic import TypeAdapter, ValidationError

from module.exceptions import (
    PlexDiscoveryError,
    PlexResponseError,
    PlexStaleAddressError,
    PlexUpstreamError,
)
from module.models.plex import (
    PinAuthResponse,
    PinData,
    PlexLibraryResponse,
    PlexResource,
    PlexServer,
)
from module.utils.plex import loggable_plex_url

PIN_URL = "https://plex.tv/api/v2/pins"
RESOURCES_URL = "https://plex.tv/api/v2/resources?includeHttps=1"
TIMEOUT_SECONDS = 5
RESOURCES_ADAPTER = TypeAdapter(list[PlexResource])


class PlexClient:
    def __init__(self, client_identifier: str):
        self.client_identifier = client_identifier
        self._headers = {
            "X-Plex-Product": "AutoBangumi",
            "X-Plex-Client-Identifier": self.client_identifier,
            "Accept": "application/json",
        }
        self.client: httpx2.AsyncClient

    async def __aenter__(self) -> PlexClient:
        self.client = httpx2.AsyncClient(
            timeout=TIMEOUT_SECONDS, trust_env=False, follow_redirects=False
        )
        return self

    async def __aexit__(self, exc_type, exc, traceback) -> None:
        await self.client.aclose()

    async def create_pin(self) -> PinData:
        try:
            response = await self.client.post(
                PIN_URL,
                params={"strong": "true"},
                headers=self._headers,
            )
            response.raise_for_status()
            return PinData.model_validate_json(response.content, strict=True)
        except (ValidationError, UnicodeDecodeError, httpx2.DecodingError) as exc:
            self._log_invalid_response("create_pin", PIN_URL, type(exc).__name__)
            raise PlexResponseError() from None
        except httpx2.HTTPStatusError as exc:
            self._log_request_error("create_pin", str(exc.request.url), exc)
            raise PlexUpstreamError() from None
        except httpx2.HTTPError as exc:
            self._log_request_error("create_pin", PIN_URL, exc)
            raise PlexUpstreamError() from None

    async def get_auth_token(self, pin_id: int, code: str) -> str | None:
        try:
            response = await self.client.get(
                f"{PIN_URL}/{pin_id}",
                params={"code": code},
                headers=self._headers,
            )
            response.raise_for_status()
            pin = PinAuthResponse.model_validate_json(response.content, strict=True)
            return pin.auth_token
        except (ValidationError, UnicodeDecodeError, httpx2.DecodingError) as exc:
            self._log_invalid_response(
                "poll_pin", f"{PIN_URL}/{pin_id}", type(exc).__name__
            )
            raise PlexResponseError() from None
        except httpx2.HTTPStatusError as exc:
            self._log_request_error("poll_pin", str(exc.request.url), exc)
            raise PlexUpstreamError() from None
        except httpx2.HTTPError as exc:
            self._log_request_error("poll_pin", f"{PIN_URL}/{pin_id}", exc)
            raise PlexUpstreamError() from None

    async def servers(self, account_token: str) -> list[PlexServer]:
        return [
            PlexServer(id=resource.client_identifier, name=resource.name)
            for resource in await self.server_resources(account_token)
        ]

    async def refresh_library(
        self, url: str, section_id: int, server_token: str, path: str
    ) -> None:
        try:
            response = await self.client.get(
                f"{url}/library/sections/{section_id}/refresh",
                headers={"X-Plex-Token": server_token},
                params={"path": path},
            )
            response.raise_for_status()
        except httpx2.HTTPStatusError as exc:
            self._log_request_error(
                "refresh_library",
                str(exc.request.url),
                exc,
                recoverable=exc.response.status_code in {401, 404, 410},
            )
            if exc.response.status_code == 401:
                raise PlexDiscoveryError("server_token_invalid") from None
            if exc.response.status_code in {404, 410}:
                raise PlexStaleAddressError(f"HTTP {exc.response.status_code}") from exc
            raise PlexUpstreamError() from exc
        except httpx2.RequestError as exc:
            self._log_request_error(
                "refresh_library",
                f"{url}/library/sections/{section_id}/refresh",
                exc,
                recoverable=True,
            )
            raise PlexStaleAddressError(f"{type(exc).__name__}: {exc}") from exc
        except httpx2.HTTPError as exc:
            self._log_request_error(
                "refresh_library",
                f"{url}/library/sections/{section_id}/refresh",
                exc,
            )
            raise PlexUpstreamError() from exc

    async def server_resources(self, account_token: str) -> list[PlexResource]:
        try:
            response = await self.client.get(
                RESOURCES_URL,
                headers={**self._headers, "X-Plex-Token": account_token},
            )
            response.raise_for_status()
            resources = RESOURCES_ADAPTER.validate_json(response.content, strict=True)
            return [
                resource
                for resource in resources
                if "server" in resource.provides.split(",")
            ]
        except httpx2.HTTPStatusError as exc:
            self._log_request_error(
                "server_resources",
                str(exc.request.url),
                exc,
                recoverable=exc.response.status_code == 401,
            )
            if exc.response.status_code == 401:
                raise PlexDiscoveryError("authorization_expired") from None
            raise PlexDiscoveryError("plex_unavailable") from None
        except (ValidationError, UnicodeDecodeError, httpx2.DecodingError) as exc:
            self._log_invalid_response(
                "server_resources", RESOURCES_URL, type(exc).__name__
            )
            raise PlexDiscoveryError("invalid_response") from None
        except httpx2.HTTPError as exc:
            self._log_request_error("server_resources", RESOURCES_URL, exc)
            raise PlexDiscoveryError("plex_unavailable") from None

    async def identity(self, url: str) -> str:
        try:
            response = await self.client.get(f"{url}/identity")
            response.raise_for_status()
        except httpx2.HTTPStatusError as exc:
            self._log_request_error(
                "server_identity", str(exc.request.url), exc, recoverable=True
            )
            raise PlexDiscoveryError("server_unreachable") from None
        except httpx2.HTTPError as exc:
            self._log_request_error(
                "server_identity", f"{url}/identity", exc, recoverable=True
            )
            raise PlexDiscoveryError("server_unreachable") from None
        try:
            root = ET.fromstring(response.content)
        except ET.ParseError as exc:
            self._log_invalid_response(
                "server_identity",
                f"{url}/identity",
                type(exc).__name__,
                recoverable=True,
            )
            raise PlexDiscoveryError("invalid_response") from None
        machine_identifier = root.get("machineIdentifier")
        if not machine_identifier:
            self._log_invalid_response(
                "server_identity",
                f"{url}/identity",
                "missing machineIdentifier",
                recoverable=True,
            )
            raise PlexDiscoveryError("invalid_response")
        return machine_identifier

    async def libraries(self, url: str, server_token: str) -> list[PlexLibraryResponse]:
        try:
            response = await self.client.get(
                f"{url}/library/sections", headers={"X-Plex-Token": server_token}
            )
            response.raise_for_status()
        except httpx2.HTTPStatusError as exc:
            self._log_request_error(
                "server_libraries",
                str(exc.request.url),
                exc,
                recoverable=True,
            )
            if exc.response.status_code == 401:
                raise PlexDiscoveryError("server_token_invalid") from None
            raise PlexDiscoveryError("server_unreachable") from None
        except httpx2.HTTPError as exc:
            self._log_request_error(
                "server_libraries",
                f"{url}/library/sections",
                exc,
                recoverable=True,
            )
            raise PlexDiscoveryError("server_unreachable") from None
        try:
            root = ET.fromstring(response.content)
        except ET.ParseError as exc:
            self._log_invalid_response(
                "server_libraries",
                f"{url}/library/sections",
                type(exc).__name__,
                recoverable=True,
            )
            raise PlexDiscoveryError("invalid_response") from None
        libraries: list[PlexLibraryResponse] = []
        invalid_library_count = 0
        for directory in root.findall("Directory"):
            try:
                library = PlexLibraryResponse.model_validate(
                    {
                        "id": directory.get("key"),
                        "title": directory.get("title"),
                        "paths": [
                            path
                            for location in directory.findall("Location")
                            if (path := location.get("path")) and path.strip()
                        ],
                    }
                )
            except ValidationError:
                invalid_library_count += 1
                continue
            libraries.append(library)
        if invalid_library_count:
            self._log_invalid_response(
                "server_libraries",
                f"{url}/library/sections",
                f"invalid library entries: {invalid_library_count}",
                recoverable=True,
            )
        return libraries

    @staticmethod
    def _log_request_error(
        operation: str,
        url: str,
        exc: httpx2.HTTPError,
        *,
        recoverable: bool = False,
    ) -> None:
        request = getattr(exc, "request", None)
        method = request.method if request is not None else "UNKNOWN"
        status_code = (
            exc.response.status_code
            if isinstance(exc, httpx2.HTTPStatusError)
            else None
        )
        reason = (
            f"HTTP {status_code}" if status_code is not None else type(exc).__name__
        )
        log = logger.warning if recoverable else logger.error
        log(
            "[Plex] Request failed: operation={} method={} url={} reason={}",
            operation,
            method,
            loggable_plex_url(url),
            reason,
        )

    @staticmethod
    def _log_invalid_response(
        operation: str,
        url: str,
        reason: str,
        *,
        recoverable: bool = False,
    ) -> None:
        log = logger.warning if recoverable else logger.error
        log(
            "[Plex] Invalid response: operation={} url={} reason={}",
            operation,
            loggable_plex_url(url),
            reason,
        )
