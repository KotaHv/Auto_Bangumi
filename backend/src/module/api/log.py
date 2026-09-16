import asyncio
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import JSONResponse

from module.conf import LOG_PATH
from module.models import APIResponse
from module.security.session import require_session

router = APIRouter(
    prefix="/log", tags=["log"], dependencies=[Depends(require_session)]
)


def read_log(lines: int | None) -> bytes:
    if lines is None:
        return LOG_PATH.read_bytes()

    with LOG_PATH.open("rb") as log_file:
        log_file.seek(0, 2)
        position = log_file.tell()
        chunks: list[bytes] = []
        newline_count = 0

        while position > 0 and newline_count <= lines:
            chunk_size = min(8192, position)
            position -= chunk_size
            log_file.seek(position)
            chunk = log_file.read(chunk_size)
            chunks.insert(0, chunk)
            newline_count += chunk.count(b"\n")

    content = b"".join(chunks)
    return b"".join(content.splitlines(keepends=True)[-lines:])


@router.get("", response_model=str)
async def get_log(
    lines: Annotated[int, Query(ge=1)] | Literal["all"] = 100,
):
    if LOG_PATH.exists():
        content = await asyncio.to_thread(read_log, None if lines == "all" else lines)
        return Response(content, media_type="text/plain")
    else:
        return Response("Log file not found", status_code=404)


@router.delete("", response_model=APIResponse)
async def clear_log():
    if LOG_PATH.exists():
        await asyncio.to_thread(LOG_PATH.write_text, "")
        return JSONResponse(
            status_code=200,
            content={"msg_en": "Log cleared successfully.", "msg_zh": "日志清除成功。"},
        )
    else:
        return JSONResponse(
            status_code=406,
            content={"msg_en": "Log file not found.", "msg_zh": "日志文件未找到。"},
        )
