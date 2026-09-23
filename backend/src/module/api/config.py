import asyncio

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from loguru import logger

from module.conf import settings
from module.models import APIResponse, Config
from module.security.session import require_session

from .deps import LogManagerDep

router = APIRouter(
    prefix="/config", tags=["config"], dependencies=[Depends(require_session)]
)


@router.get("/get", response_model=Config)
async def get_config():
    return settings


@router.patch("/update", response_model=APIResponse)
async def update_config(
    config: Config,
    log_manager: LogManagerDep,
):
    try:
        await asyncio.to_thread(settings.save, config.model_dump_json(by_alias=True))
        await asyncio.to_thread(settings.load)
        # update_rss()
        await asyncio.to_thread(
            log_manager.setup, debug_enabled=settings.log.debug_enable
        )
        logger.info("Config updated")
        return JSONResponse(
            status_code=200,
            content={
                "msg_en": "Update config successfully.",
                "msg_zh": "更新配置成功。",
            },
        )
    except Exception as e:
        logger.warning(e)
        return JSONResponse(
            status_code=406,
            content={"msg_en": "Update config failed.", "msg_zh": "更新配置失败。"},
        )
