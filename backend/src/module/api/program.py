import os
import signal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from loguru import logger

from module.conf import VERSION
from module.models import APIResponse, ProgramStatusResponse
from module.security.session import require_session

from .deps import ProgramDep
from .response import u_response

router = APIRouter(tags=["program"], dependencies=[Depends(require_session)])


@router.post("/restart", response_model=APIResponse)
async def restart(program: ProgramDep):
    try:
        resp = await program.restart()
        return u_response(resp)
    except Exception as e:
        logger.debug(e)
        logger.warning("Failed to restart program")
        raise HTTPException(
            status_code=500,
            detail={
                "msg_en": "Failed to restart program.",
                "msg_zh": "重启程序失败。",
            },
        ) from e


@router.post("/start", response_model=APIResponse)
async def start(program: ProgramDep):
    try:
        resp = await program.start()
        return u_response(resp)
    except Exception as e:
        logger.debug(e)
        logger.warning("Failed to start program")
        raise HTTPException(
            status_code=500,
            detail={
                "msg_en": "Failed to start program.",
                "msg_zh": "启动程序失败。",
            },
        ) from e


@router.post("/stop", response_model=APIResponse)
async def stop(program: ProgramDep):
    return u_response(await program.stop())


@router.get("/status", response_model=ProgramStatusResponse)
async def program_status(program: ProgramDep):
    if not program.is_running:
        return {
            "status": False,
            "version": VERSION,
            "first_run": program.first_run,
        }
    else:
        return {
            "status": True,
            "version": VERSION,
            "first_run": program.first_run,
        }


@router.post("/shutdown", response_model=APIResponse)
async def shutdown_program(program: ProgramDep):
    await program.stop()
    logger.info("Shutting down program...")
    os.kill(os.getpid(), signal.SIGINT)
    return JSONResponse(
        status_code=200,
        content={
            "msg_en": "Shutdown program successfully.",
            "msg_zh": "关闭程序成功。",
        },
    )
