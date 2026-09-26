from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request

from module.database import Database
from module.logger import LoggerManager


def get_log_manager(request: Request) -> LoggerManager:
    return request.app.state.log_manager


LogManagerDep = Annotated[LoggerManager, Depends(get_log_manager)]


async def get_database() -> AsyncIterator[Database]:
    async with Database() as db:
        yield db


DatabaseDep = Annotated[Database, Depends(get_database, scope="function")]
