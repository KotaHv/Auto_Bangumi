from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from module.downloader import DownloadClient
from module.models import APIResponse, Bangumi, BangumiUpdate
from module.security.session import require_session
from module.service.bangumi import BangumiService
from module.service.rename import RenameService
from module.service.torrent import TorrentService

from .deps import DatabaseDep
from .response import u_response

router = APIRouter(
    prefix="/bangumi", tags=["bangumi"], dependencies=[Depends(require_session)]
)


@router.get("/get/all", response_model=list[Bangumi])
async def get_all_data(db: DatabaseDep):
    return await BangumiService(db).search_all()


@router.patch(
    "/update/{bangumi_id}",
    response_model=APIResponse,
)
async def update_rule(
    bangumi_id: int,
    data: BangumiUpdate,
    db: DatabaseDep,
):
    resp = await TorrentService(db).update_rule(bangumi_id, data)
    return u_response(resp)


@router.delete(
    path="/delete/{bangumi_id}",
    response_model=APIResponse,
)
async def delete_rule(bangumi_id: int, db: DatabaseDep, file: bool = False):
    resp = await BangumiService(db).delete_one(bangumi_id, file)
    return u_response(resp)


@router.post(
    path="/disable/{bangumi_id}",
    response_model=APIResponse,
)
async def disable_rule(bangumi_id: int, db: DatabaseDep, file: bool = False):
    resp = await TorrentService(db).disable_rule(bangumi_id, file)
    return u_response(resp)


@router.post(
    path="/enable/{bangumi_id}",
    response_model=APIResponse,
)
async def enable_rule(bangumi_id: int, db: DatabaseDep):
    resp = await TorrentService(db).enable_rule(bangumi_id)
    return u_response(resp)


@router.post(
    path="/refresh/poster/all",
    response_model=APIResponse,
)
async def refresh_all_poster(db: DatabaseDep):
    resp = await BangumiService(db).refresh_poster()
    return u_response(resp)


@router.post(
    "/rename",
    response_model=APIResponse,
)
async def rename(data: Bangumi, db: DatabaseDep):
    if data.save_path is None:
        return JSONResponse(
            status_code=400,
            content={
                "msg_en": "No save path provided.",
                "msg_zh": "缺少保存路径。",
            },
        )
    async with DownloadClient() as client:
        await RenameService(db, client).rename_for_path(data.save_path)
    return JSONResponse(
        status_code=200,
        content={
            "msg_en": f"Renamed '{data.official_title}' successfully.",
            "msg_zh": f"'{data.official_title}' 重命名成功。",
        },
    )
