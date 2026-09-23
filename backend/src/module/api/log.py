import asyncio
import json
from collections.abc import AsyncIterator
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from module.database.log import DEFAULT_LIMIT, LogDatabase
from module.exceptions import LogQueryError
from module.models import ClearLogResult, LogPage, LogRecord, TailFilters
from module.security.session import require_session

from .deps import LogManagerDep

router = APIRouter(prefix="/log", tags=["log"], dependencies=[Depends(require_session)])
TAIL_POLL_INTERVAL_SECONDS = 1


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


@router.get("/tail")
async def tail_log(
    request: Request,
    log_manager: LogManagerDep,
    level: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    module: str | None = None,
    query: str | None = None,
) -> EventSourceResponse:
    database = log_manager.database
    filters = TailFilters(
        level=level,
        start=start,
        end=end,
        module=module,
        query=query,
    )
    try:
        initial = await asyncio.to_thread(
            database.query_latest_logs, **filters.model_dump()
        )
    except LogQueryError as error:
        raise HTTPException(
            status_code=400,
            detail={"msg_en": error.msg_en, "msg_zh": error.msg_zh},
        ) from error

    return EventSourceResponse(
        _tail_event_stream(request, database, initial, filters),
    )


async def _tail_event_stream(
    request: Request,
    database: LogDatabase,
    initial: list[LogRecord],
    filters: TailFilters,
) -> AsyncIterator[dict[str, str]]:
    yield {
        "event": "initial",
        "data": json.dumps(
            [record.model_dump(mode="json") for record in initial], ensure_ascii=False
        ),
    }
    last_id = initial[-1].id if initial else 0

    while not await request.is_disconnected():
        while True:
            page = await asyncio.to_thread(
                database.query_logs_after,
                last_id=last_id,
                **filters.model_dump(),
            )
            for record in page.items:
                last_id = record.id
                yield {
                    "event": "log",
                    "data": record.model_dump_json(),
                }
            if not page.has_more:
                break
        await asyncio.sleep(TAIL_POLL_INTERVAL_SECONDS)


@router.delete("", response_model=ClearLogResult)
async def clear_log(log_manager: LogManagerDep):
    return ClearLogResult(deleted_count=log_manager.database.clear())
