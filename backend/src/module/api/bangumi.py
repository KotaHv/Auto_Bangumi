from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from module.database import Database
from module.downloader import DownloadClient
from module.models import APIResponse, Bangumi, BangumiUpdate
from module.security.session import require_session
from module.service.bangumi import BangumiService
from module.service.rename import RenameService
from module.service.torrent import TorrentService

from .response import u_response

router = APIRouter(
    prefix="/bangumi", tags=["bangumi"], dependencies=[Depends(require_session)]
)


@router.get("/get/all", response_model=list[Bangumi])
async def get_all_data():
    async with Database() as session:
        return await BangumiService(session).search_all()


@router.get(
    "/get/{bangumi_id}",
    response_model=Bangumi,
)
async def get_data(bangumi_id: int):
    async with Database() as session:
        return await TorrentService(session).search_one(bangumi_id)


@router.patch(
    "/update/{bangumi_id}",
    response_model=APIResponse,
)
async def update_rule(
    bangumi_id: int,
    data: BangumiUpdate,
):
    async with Database() as session:
        resp = await TorrentService(session).update_rule(bangumi_id, data)
    return u_response(resp)


@router.delete(
    path="/delete/all",
    response_model=APIResponse,
)
async def delete_all():
    async with Database() as session:
        await BangumiService(session).delete_all()
    return JSONResponse(
        status_code=200,
        content={
            "msg_en": "Deleted all rules successfully.",
            "msg_zh": "已删除所有规则。",
        },
    )


@router.delete(
    path="/delete/{bangumi_id}",
    response_model=APIResponse,
)
async def delete_rule(bangumi_id: int, file: bool = False):
    async with Database() as session:
        resp = await BangumiService(session).delete_one(bangumi_id, file)
    return u_response(resp)


@router.delete(
    path="/delete/many/",
    response_model=APIResponse,
)
async def delete_many_rule(bangumi_id: list[int], file: bool = False):
    async with Database() as session:
        service = BangumiService(session)
        for i in bangumi_id:
            resp = await service.delete_one(i, file)
    return u_response(resp)


@router.post(
    path="/disable/{bangumi_id}",
    response_model=APIResponse,
)
async def disable_rule(bangumi_id: int, file: bool = False):
    async with Database() as session:
        resp = await TorrentService(session).disable_rule(bangumi_id, file)
    return u_response(resp)


@router.post(
    path="/disable/many",
    response_model=APIResponse,
)
async def disable_many_rule(bangumi_id: list[int], file: bool = False):
    async with Database() as session:
        service = TorrentService(session)
        for i in bangumi_id:
            resp = await service.disable_rule(i, file)
    return u_response(resp)


@router.post(
    path="/enable/{bangumi_id}",
    response_model=APIResponse,
)
async def enable_rule(bangumi_id: int):
    async with Database() as session:
        resp = await TorrentService(session).enable_rule(bangumi_id)
    return u_response(resp)


@router.post(
    path="/refresh/poster/all",
    response_model=APIResponse,
)
async def refresh_all_poster():
    async with Database() as session:
        resp = await BangumiService(session).refresh_poster()
    return u_response(resp)


@router.post(
    path="/refresh/poster/{bangumi_id}",
    response_model=APIResponse,
)
async def refresh_poster(bangumi_id: int):
    async with Database() as session:
        resp = await BangumiService(session).refind_poster(bangumi_id)
    return u_response(resp)


@router.post(
    "/rename",
    response_model=APIResponse,
)
async def rename(data: Bangumi):
    if data.save_path is None:
        return JSONResponse(
            status_code=400,
            content={
                "msg_en": "No save path provided.",
                "msg_zh": "缺少保存路径。",
            },
        )
    async with Database() as session, DownloadClient() as client:
        await RenameService(session, client).rename_for_path(data.save_path)
    return JSONResponse(
        status_code=200,
        content={
            "msg_en": f"Renamed '{data.official_title}' successfully.",
            "msg_zh": f"'{data.official_title}' 重命名成功。",
        },
    )
