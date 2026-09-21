from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from module.manager import Renamer, TorrentManager
from module.models import APIResponse, Bangumi, BangumiUpdate
from module.security.session import require_session

from .response import u_response

router = APIRouter(
    prefix="/bangumi", tags=["bangumi"], dependencies=[Depends(require_session)]
)


@router.get("/get/all", response_model=list[Bangumi])
async def get_all_data():
    async with TorrentManager() as manager:
        return await manager.bangumi.search_all()


@router.get(
    "/get/{bangumi_id}",
    response_model=Bangumi,
)
async def get_data(bangumi_id: str):
    async with TorrentManager() as manager:
        resp = await manager.search_one(bangumi_id)
    return resp


@router.patch(
    "/update/{bangumi_id}",
    response_model=APIResponse,
)
async def update_rule(
    bangumi_id: int,
    data: BangumiUpdate,
):
    async with TorrentManager() as manager:
        resp = await manager.update_rule(bangumi_id, data)
    return u_response(resp)


@router.delete(
    path="/delete/all",
    response_model=APIResponse,
)
async def delete_all():
    async with TorrentManager() as manager:
        await manager.bangumi.delete_all()
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
async def delete_rule(bangumi_id: str, file: bool = False):
    async with TorrentManager() as manager:
        resp = await manager.delete_rule(bangumi_id, file)
    return u_response(resp)


@router.delete(
    path="/delete/many/",
    response_model=APIResponse,
)
async def delete_many_rule(bangumi_id: list, file: bool = False):
    async with TorrentManager() as manager:
        for i in bangumi_id:
            resp = await manager.delete_rule(i, file)
    return u_response(resp)


@router.post(
    path="/disable/{bangumi_id}",
    response_model=APIResponse,
)
async def disable_rule(bangumi_id: str, file: bool = False):
    async with TorrentManager() as manager:
        resp = await manager.disable_rule(bangumi_id, file)
    return u_response(resp)


@router.post(
    path="/disable/many",
    response_model=APIResponse,
)
async def disable_many_rule(bangumi_id: list, file: bool = False):
    async with TorrentManager() as manager:
        for i in bangumi_id:
            resp = await manager.disable_rule(i, file)
    return u_response(resp)


@router.post(
    path="/enable/{bangumi_id}",
    response_model=APIResponse,
)
async def enable_rule(bangumi_id: str):
    async with TorrentManager() as manager:
        resp = await manager.enable_rule(bangumi_id)
    return u_response(resp)


@router.post(
    path="/refresh/poster/all",
    response_model=APIResponse,
)
async def refresh_all_poster():
    async with TorrentManager() as manager:
        resp = await manager.refresh_poster()
    return u_response(resp)


@router.post(
    path="/refresh/poster/{bangumi_id}",
    response_model=APIResponse,
)
async def refresh_poster(bangumi_id: int):
    async with TorrentManager() as manager:
        resp = await manager.refind_poster(bangumi_id)
    return u_response(resp)


@router.post(
    "/rename",
    response_model=APIResponse,
)
async def rename(data: Bangumi):
    async with Renamer() as renamer:
        if data.save_path is None:
            return JSONResponse(
                status_code=400,
                content={
                    "msg_en": "No save path provided.",
                    "msg_zh": "缺少保存路径。",
                },
            )
        bangumi_name, _ = renamer._path_to_bangumi(data.save_path)
        await renamer.rename(bangumi_name)
    return JSONResponse(
        status_code=200,
        content={
            "msg_en": f"Renamed '{data.official_title}' successfully.",
            "msg_zh": f"'{data.official_title}' 重命名成功。",
        },
    )
