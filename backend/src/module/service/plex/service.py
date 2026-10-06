import asyncio
import uuid
from collections.abc import AsyncGenerator, Iterable
from contextlib import asynccontextmanager

from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from module.conf import settings
from module.database.plex import PlexDatabase
from module.database.plex_refresh import PlexRefreshDatabase
from module.exceptions import (
    PlexDiscoveryError,
    PlexError,
    PlexInputError,
    PlexStaleAddressError,
)
from module.models.plex import (
    AuthFinishedResponse,
    AuthIdleResponse,
    AuthPendingResponse,
    AuthStartResponse,
    AuthStatusResponse,
    PinAttempt,
    PlexAuthState,
    PlexConnection,
    PlexConnectionState,
    PlexLibrariesResponse,
    PlexLibraryResponse,
    PlexRefreshJob,
    PlexServer,
)
from module.network import plex as plex_network
from module.service.plex.discovery import PlexDiscovery
from module.utils.plex import (
    build_plex_server_url,
    map_library_path,
    plex_auth_url,
)


class PlexService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.database = PlexDatabase(session)
        self.jobs = PlexRefreshDatabase(session)

    @asynccontextmanager
    async def _commit_or_plex_error(self, context: str) -> AsyncGenerator[None]:
        try:
            yield
            await self.session.commit()
        except Exception as exc:
            await self.session.rollback()
            if isinstance(exc, PlexInputError):
                raise
            origin = getattr(exc, "orig", None)
            if origin is None:
                logger.error("[Plex] {} ({})", context, type(exc).__name__)
            else:
                logger.error(
                    "[Plex] {} ({}: {})",
                    context,
                    type(origin).__name__,
                    origin,
                )
            raise PlexError() from exc

    async def _mark_account_reauth_required(self, connection: PlexConnection) -> None:
        if connection.account_reauth_required:
            return
        async with self._commit_or_plex_error(
            "Failed to store the Plex account reauthorization state"
        ):
            connection.account_reauth_required = True
            await self.database.update(connection)
        logger.warning("[Plex] Account token rejected; reauthorization is required")

    @asynccontextmanager
    async def _account_plex_client(
        self, connection: PlexConnection
    ) -> AsyncGenerator[plex_network.PlexClient]:
        try:
            async with plex_network.PlexClient(connection.client_identifier) as plex:
                yield plex
        except PlexDiscoveryError as exc:
            if exc.code == "authorization_expired":
                await self._mark_account_reauth_required(connection)
            raise

    async def start_auth(self, auth_state: PlexAuthState) -> AuthStartResponse:
        connection = await self.database.get()
        if connection is None:
            client_identifier = str(uuid.uuid4())
            async with self._commit_or_plex_error(
                "Failed to create the Plex connection record"
            ):
                connection = self.database.create(client_identifier)
        else:
            client_identifier = connection.client_identifier
        async with plex_network.PlexClient(client_identifier) as plex:
            pin = await plex.create_pin()
        auth_state.attempt = PinAttempt.from_pin(
            pin, now=asyncio.get_running_loop().time()
        )
        logger.info("[Plex] Started account authorization")
        return AuthStartResponse(auth_url=plex_auth_url(client_identifier, pin.code))

    async def poll_auth(
        self, auth_state: PlexAuthState, *, wake_event: asyncio.Event
    ) -> AuthStatusResponse:
        attempt = auth_state.attempt
        if attempt is None:
            return AuthIdleResponse()
        if attempt.status == "completed":
            return AuthFinishedResponse(status="completed")
        if attempt.is_expired(asyncio.get_running_loop().time()):
            return AuthFinishedResponse(status="expired")
        connection = await self.database.get()
        if connection is None:
            auth_state.attempt = None
            return AuthFinishedResponse(status="expired")
        async with plex_network.PlexClient(connection.client_identifier) as plex:
            token = await plex.get_auth_token(attempt.pin_id, attempt.code)
        if not token:
            return AuthPendingResponse(
                auth_url=plex_auth_url(connection.client_identifier, attempt.code),
            )
        reauthorizing = connection.account_reauth_required
        # The account token may expire after initial authorization but before the user
        # saves a server and library. In that case, reauthorization should only replace
        # the account token and clear this flag; there is no saved connection to recover.
        if (
            reauthorizing
            and connection.server_identifier is not None
            and connection.section_id is not None
        ):
            async with plex_network.PlexClient(connection.client_identifier) as plex:
                discovery = await PlexDiscovery(plex, token).discover_server_libraries(
                    connection.server_identifier
                )
            discovery.validate_library_path(connection.section_id, connection.path)
            connection.server_token = discovery.server_token
            connection.url = discovery.url
        async with self._commit_or_plex_error(
            "Failed to store the Plex account authorization"
        ):
            connection.token = token
            if reauthorizing:
                connection.account_reauth_required = False
            else:
                connection.clear_configuration()
                await self.jobs.clear()
            await self.database.update(connection)
        attempt.status = "completed"
        logger.info(
            "[Plex] Account {} completed",
            "reauthorization" if reauthorizing else "authorization",
        )
        if reauthorizing:
            wake_event.set()
        return AuthFinishedResponse(status="completed")

    async def connection_state(self) -> PlexConnectionState:
        connection = await self.database.get()
        return PlexConnectionState.from_connection(connection)

    async def plex_servers(self) -> list[PlexServer]:
        connection = await self.database.get()
        if (
            connection is None
            or not connection.token
            or connection.account_reauth_required
        ):
            raise PlexDiscoveryError("authorization_expired")
        async with self._account_plex_client(connection) as plex:
            return await plex.servers(connection.token)

    async def libraries_for_server(self, server_id: str) -> PlexLibrariesResponse:
        connection = await self.database.get()
        if (
            connection is None
            or not connection.token
            or connection.account_reauth_required
        ):
            raise PlexDiscoveryError("authorization_expired")
        async with self._account_plex_client(connection) as plex:
            discoverer = PlexDiscovery(plex, connection.token)
            discovery = await discoverer.discover_server_libraries(server_id)
        return PlexLibrariesResponse(url=discovery.url, libraries=discovery.libraries)

    async def libraries_for_connection(
        self, host: str, port: int, ssl: bool
    ) -> list[PlexLibraryResponse]:
        url = build_plex_server_url(host, port, ssl)
        connection = await self.database.get()
        if (
            connection is None
            or not connection.token
            or connection.account_reauth_required
        ):
            raise PlexDiscoveryError("authorization_expired")
        async with self._account_plex_client(connection) as plex:
            discoverer = PlexDiscovery(plex, connection.token)
            discovery = await discoverer.discover_connection(url)
        return discovery.libraries

    async def save_connection(
        self,
        host: str,
        port: int,
        ssl: bool,
        section_id: int,
        path: str,
    ) -> None:
        url = build_plex_server_url(host, port, ssl)
        connection = await self.database.get()
        if connection is None or not connection.token:
            raise PlexInputError("Plex account is not connected")
        if connection.account_reauth_required:
            raise PlexDiscoveryError("authorization_expired")
        async with self._account_plex_client(connection) as plex:
            discoverer = PlexDiscovery(plex, connection.token)
            discovery = await discoverer.discover_connection(url)
        discovery.validate_library_path(section_id, path)
        async with self._commit_or_plex_error("Failed to save the Plex connection"):
            configuration_changed = connection.configure(
                url=url,
                section_id=section_id,
                path=path,
                server_token=discovery.server_token,
                server_identifier=discovery.server_identifier,
            )
            await self.database.update(connection)
            if configuration_changed:
                await self.jobs.clear()
        logger.info(
            "[Plex] Saved server {} library section {}",
            discovery.server_identifier,
            section_id,
        )

    async def set_enabled(self, enabled: bool) -> None:
        connection = await self.database.get()
        if connection is None and enabled:
            raise PlexInputError("Configure a Plex server and library before enabling")
        async with self._commit_or_plex_error(
            "Failed to update the Plex enabled state"
        ):
            if connection is not None:
                connection.set_enabled(enabled)
                await self.database.update(connection)
            if not enabled:
                await self.jobs.clear()
        logger.info(
            "[Plex] Refresh integration {}", "enabled" if enabled else "disabled"
        )

    async def disconnect(self, auth_state: PlexAuthState) -> None:
        auth_state.attempt = None
        connection = await self.database.get()
        async with self._commit_or_plex_error("Failed to disconnect the Plex account"):
            if connection is not None:
                connection.disconnect()
                await self.database.update(connection)
            await self.jobs.clear()
        logger.info("[Plex] Disconnected Plex account")

    async def _get_auto_refresh_library_path(self) -> str | None:
        connection = await self.database.get()
        return connection.auto_refresh_library_path if connection is not None else None

    async def queue_refresh(self, save_paths: Iterable[str]) -> bool:
        library_path = await self._get_auto_refresh_library_path()
        if library_path is None:
            return False
        mapped_paths: set[str] = set()
        for save_path in save_paths:
            mapped_path = map_library_path(
                save_path, settings.downloader.path, library_path
            )
            if mapped_path is not None:
                mapped_paths.add(mapped_path)
        if not mapped_paths:
            return False
        await self.jobs.enqueue(sorted(mapped_paths))
        await self.session.commit()
        logger.info("[Plex] Queued refresh for {} mapped path(s)", len(mapped_paths))
        return True

    async def queue_library_refresh(self) -> bool:
        library_path = await self._get_auto_refresh_library_path()
        if library_path is None:
            return False
        await self.jobs.enqueue([library_path])
        await self.session.commit()
        logger.info("[Plex] Queued library refresh for {}", library_path)
        return True

    async def refresh_path(self, path: str) -> bool:
        connection = await self.database.get()
        if (
            connection is None
            or connection.account_reauth_required
            or connection.auto_refresh_library_path is None
        ):
            return False
        try:
            await self._refresh_with_recovery(connection, path)
        except PlexDiscoveryError as exc:
            if exc.code == "authorization_expired":
                return False
            raise
        return True

    async def refresh_library(self) -> None:
        connection = await self.database.get()
        if connection is None or not connection.is_configured:
            raise PlexInputError(
                "Configure a Plex server and library before refreshing"
            )
        if connection.account_reauth_required:
            raise PlexDiscoveryError("authorization_expired")
        await self._refresh_with_recovery(connection, connection.path)
        logger.info("[Plex] Manual library refresh accepted")

    async def _refresh_with_recovery(
        self, connection: PlexConnection, path: str
    ) -> None:
        try:
            await self._send_refresh(connection, path)
        except (PlexStaleAddressError, PlexDiscoveryError) as exc:
            if (
                isinstance(exc, PlexDiscoveryError)
                and exc.code != "server_token_invalid"
            ):
                raise
            logger.warning(
                "[Plex] Refresh failed for server {}; attempting connection recovery ({})",
                connection.server_identifier,
                exc.code if isinstance(exc, PlexDiscoveryError) else type(exc).__name__,
            )
            await self._recover_connection(connection)
            logger.info(
                "[Plex] Server {} recovered; retrying library refresh",
                connection.server_identifier,
            )
            await self._send_refresh(connection, path)

    async def _send_refresh(self, connection: PlexConnection, path: str) -> None:
        if connection.server_token is None or connection.section_id is None:
            raise PlexInputError("Plex server configuration is incomplete")
        async with plex_network.PlexClient(connection.client_identifier) as plex:
            await plex.refresh_library(
                connection.url,
                connection.section_id,
                connection.server_token,
                path,
            )

    async def _recover_connection(self, connection: PlexConnection) -> None:
        if connection.server_identifier is None or connection.token is None:
            raise PlexInputError("Plex server identity is missing")
        if connection.section_id is None:
            raise PlexInputError("Plex server configuration is incomplete")
        async with self._account_plex_client(connection) as plex:
            discoverer = PlexDiscovery(plex, connection.token)
            discovery = await discoverer.discover_server_libraries(
                connection.server_identifier
            )
        discovery.validate_library_path(connection.section_id, connection.path)
        async with self._commit_or_plex_error(
            "Failed to commit the recovered Plex address"
        ):
            connection.apply_server_recovery(
                url=discovery.url, server_token=discovery.server_token
            )
            await self.database.update(connection)

    async def list_refresh_jobs(self) -> list[PlexRefreshJob]:
        return await self.jobs.list_jobs()

    async def has_refresh_jobs(self) -> bool:
        return await self.jobs.has_jobs()

    async def complete_refresh_job(self, job: PlexRefreshJob) -> bool:
        removed = await self.jobs.remove_if_current(job)
        await self.session.commit()
        return removed
