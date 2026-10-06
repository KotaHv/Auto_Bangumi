import asyncio
from typing import Annotated

from fastapi import Depends, Request

from module.core import Program
from module.logger import LoggerManager
from module.models.plex import PlexAuthState


def get_log_manager(request: Request) -> LoggerManager:
    return request.app.state.log_manager


LogManagerDep = Annotated[LoggerManager, Depends(get_log_manager)]


def get_plex_refresh_event(request: Request) -> asyncio.Event:
    return request.app.state.plex_refresh_event


PlexRefreshEventDep = Annotated[asyncio.Event, Depends(get_plex_refresh_event)]


def get_plex_auth_state(request: Request) -> PlexAuthState:
    return request.app.state.plex_auth_state


PlexAuthStateDep = Annotated[PlexAuthState, Depends(get_plex_auth_state)]


def get_program(request: Request) -> Program:
    return request.app.state.program


ProgramDep = Annotated[Program, Depends(get_program)]
