from fastapi import APIRouter, Depends

from module.api.deps import PlexAuthStateDep, PlexRefreshEventDep
from module.database.deps import DatabaseDep
from module.models.plex import (
    AuthStartResponse,
    AuthStatusResponse,
    ConnectionEnabledUpdate,
    ConnectionUpdate,
    LibrariesRequest,
    PlexConnectionState,
    PlexLibrariesResponse,
    PlexLibraryResponse,
    PlexServer,
)
from module.security.session import require_session
from module.service.plex import PlexService

router = APIRouter(
    prefix="/plex", tags=["plex"], dependencies=[Depends(require_session)]
)


@router.post("/auth/start", response_model=AuthStartResponse)
async def auth_start(
    db: DatabaseDep, auth_state: PlexAuthStateDep
) -> AuthStartResponse:
    return await PlexService(db).start_auth(auth_state)


@router.get("/auth/status", response_model=AuthStatusResponse)
async def auth_status(
    db: DatabaseDep,
    auth_state: PlexAuthStateDep,
    wake_event: PlexRefreshEventDep,
) -> AuthStatusResponse:
    return await PlexService(db).poll_auth(auth_state, wake_event=wake_event)


@router.get("/connection", response_model=PlexConnectionState)
async def get_connection(db: DatabaseDep) -> PlexConnectionState:
    return await PlexService(db).connection_state()


@router.get("/servers", response_model=list[PlexServer])
async def get_servers(db: DatabaseDep) -> list[PlexServer]:
    return await PlexService(db).plex_servers()


@router.get("/servers/{server_id}/libraries", response_model=PlexLibrariesResponse)
async def get_server_libraries(
    server_id: str, db: DatabaseDep
) -> PlexLibrariesResponse:
    return await PlexService(db).libraries_for_server(server_id)


@router.post("/libraries", response_model=list[PlexLibraryResponse])
async def get_libraries(
    request: LibrariesRequest, db: DatabaseDep
) -> list[PlexLibraryResponse]:
    return await PlexService(db).libraries_for_connection(
        request.host, request.port, request.ssl
    )


@router.patch("/connection", response_model=PlexConnectionState)
async def update_connection(
    request: ConnectionUpdate, db: DatabaseDep
) -> PlexConnectionState:
    service = PlexService(db)
    await service.save_connection(
        request.host,
        request.port,
        request.ssl,
        request.section_id,
        request.path,
    )
    return await service.connection_state()


@router.patch("/connection/enabled", response_model=PlexConnectionState)
async def update_connection_enabled(
    request: ConnectionEnabledUpdate, db: DatabaseDep
) -> PlexConnectionState:
    service = PlexService(db)
    await service.set_enabled(request.enabled)
    return await service.connection_state()


@router.delete("/connection", response_model=PlexConnectionState)
async def delete_connection(
    db: DatabaseDep, auth_state: PlexAuthStateDep
) -> PlexConnectionState:
    await PlexService(db).disconnect(auth_state)
    return PlexConnectionState.from_connection(None)


@router.post("/refresh")
async def refresh_library(db: DatabaseDep) -> dict[str, str]:
    await PlexService(db).refresh_library()
    return {"status": "sent"}
