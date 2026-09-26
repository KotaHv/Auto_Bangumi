from typing import Annotated

from fastapi import Depends, Request

from module.database.deps import DatabaseDep, get_database
from module.logger import LoggerManager

__all__ = ["DatabaseDep", "get_database", "LogManagerDep", "get_log_manager"]


def get_log_manager(request: Request) -> LoggerManager:
    return request.app.state.log_manager


LogManagerDep = Annotated[LoggerManager, Depends(get_log_manager)]
