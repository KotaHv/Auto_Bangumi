import asyncio

from loguru import logger

from module.exceptions import PlexDiscoveryCode, PlexDiscoveryError
from module.models.plex import (
    PlexConnectionDiscovery,
    PlexLibraryDiscovery,
    PlexProbeFailure,
    PlexProbeResult,
    PlexProbeSuccess,
)
from module.network.plex import PlexClient
from module.utils.plex import loggable_plex_url, preferred_local_urls


class PlexDiscovery:
    def __init__(self, client: PlexClient, account_token: str) -> None:
        self._client = client
        self._account_token = account_token

    async def discover_server_libraries(self, server_id: str) -> PlexLibraryDiscovery:
        resources = await self._client.server_resources(self._account_token)
        resource = next(
            (item for item in resources if item.client_identifier == server_id),
            None,
        )
        if resource is None:
            logger.error(
                "[Plex] Server not found in account resources: server={}", server_id
            )
            raise PlexDiscoveryError("server_unrecognized")
        server_token = resource.access_token
        connection_urls = preferred_local_urls(resource.connections)
        if not connection_urls:
            logger.error(
                "[Plex] Server has no eligible local connections: server={}",
                server_id,
            )
            raise PlexDiscoveryError("no_reachable_connection")
        probe_results = await asyncio.gather(
            *(
                self._probe_server_connection(url, server_id, server_token)
                for url in connection_urls
            )
        )
        failure_codes: set[PlexDiscoveryCode] = set()
        for result in probe_results:
            if isinstance(result, PlexProbeSuccess):
                return PlexLibraryDiscovery(
                    url=result.url,
                    libraries=result.libraries,
                    server_token=server_token,
                )
            failure_codes.add(result.code)
        logger.error(
            "[Plex] Server discovery failed: server={} attempted_connections={} failure_codes={}",
            server_id,
            len(connection_urls),
            ",".join(sorted(failure_codes)),
        )
        if "server_token_invalid" in failure_codes:
            raise PlexDiscoveryError("server_token_invalid")
        if "invalid_response" in failure_codes:
            raise PlexDiscoveryError("invalid_response")
        raise PlexDiscoveryError("no_reachable_connection")

    async def discover_connection(self, url: str) -> PlexConnectionDiscovery:
        server_identifier = await self._client.identity(url)
        resources = await self._client.server_resources(self._account_token)
        resource = next(
            (item for item in resources if item.client_identifier == server_identifier),
            None,
        )
        if resource is None:
            logger.error(
                "[Plex] Server not found in account resources: server={} url={}",
                server_identifier,
                loggable_plex_url(url),
            )
            raise PlexDiscoveryError("server_unrecognized")
        server_token = resource.access_token
        libraries = await self._client.libraries(url, server_token)
        return PlexConnectionDiscovery(
            server_identifier=server_identifier,
            server_token=server_token,
            libraries=libraries,
        )

    async def _probe_server_connection(
        self, url: str, server_id: str, server_token: str
    ) -> PlexProbeResult:
        try:
            server_identifier = await self._client.identity(url)
            if server_identifier != server_id:
                logger.warning(
                    "[Plex] Connection {} identifies as server {}, expected {}",
                    loggable_plex_url(url),
                    server_identifier,
                    server_id,
                )
                return PlexProbeFailure(url, "no_reachable_connection")
            libraries = await self._client.libraries(url, server_token)
        except PlexDiscoveryError as exc:
            return PlexProbeFailure(url, exc.code)
        return PlexProbeSuccess(url, libraries)
