from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from module.database.log import DEFAULT_LIMIT
from module.exceptions import LogQueryError
from module.models import ClearLogResult, LogPage
from module.security.session import require_session

from .deps import LogManagerDep

router = APIRouter(prefix="/log", tags=["log"], dependencies=[Depends(require_session)])


@router.get("", response_model=LogPage)
async def get_log(
    log_manager: LogManagerDep,
    level: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    module: str | None = None,
    query: str | None = None,
    limit: int = DEFAULT_LIMIT,
    before_id: int | None = None,
):
    try:
        return log_manager.database.query_logs(
            level=level,
            start=start,
            end=end,
            module=module,
            query=query,
            limit=limit,
            before_id=before_id,
        )
    except LogQueryError as error:
        raise HTTPException(
            status_code=400,
            detail={"msg_en": error.msg_en, "msg_zh": error.msg_zh},
        ) from error


@router.delete("", response_model=ClearLogResult)
async def clear_log(log_manager: LogManagerDep):
    return ClearLogResult(deleted_count=log_manager.database.clear())
