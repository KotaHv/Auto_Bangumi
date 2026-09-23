from typing import Annotated

from fastapi import Depends, Request

from module.logger import LoggerManager


def get_log_manager(request: Request) -> LoggerManager:
    return request.app.state.log_manager


LogManagerDep = Annotated[LoggerManager, Depends(get_log_manager)]
