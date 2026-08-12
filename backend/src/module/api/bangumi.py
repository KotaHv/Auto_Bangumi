from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from module.manager import Renamer, TorrentManager
from module.models import APIResponse, Bangumi, BangumiUpdate
from module.security.api import get_current_user

from .response import u_response

router = APIRouter(prefix="/bangumi", tags=["bangumi"])


@router.get(
    "/get/all", response_model=list[Bangumi], dependencies=[Depends(get_current_user)]
)
def get_all_data():
    with TorrentManager() as manager:
        return manager.bangumi.search_all()


@router.get(
    "/get/{bangumi_id}",
    response_model=Bangumi,
    dependencies=[Depends(get_current_user)],
)
def get_data(bangumi_id: str):
    with TorrentManager() as manager:
        resp = manager.search_one(bangumi_id)
    return resp


@router.patch(
    "/update/{bangumi_id}",
    response_model=APIResponse,
    dependencies=[Depends(get_current_user)],
)
def update_rule(
    bangumi_id: int,
    data: BangumiUpdate,
):
    with TorrentManager() as manager:
        resp = manager.update_rule(bangumi_id, data)
    return u_response(resp)


@router.delete(
    path="/delete/{bangumi_id}",
    response_model=APIResponse,
    dependencies=[Depends(get_current_user)],
)
def delete_rule(bangumi_id: str, file: bool = False):
    with TorrentManager() as manager:
        resp = manager.delete_rule(bangumi_id, file)
    return u_response(resp)


@router.delete(
    path="/delete/many/",
    response_model=APIResponse,
    dependencies=[Depends(get_current_user)],
)
def delete_many_rule(bangumi_id: list, file: bool = False):
    with TorrentManager() as manager:
        for i in bangumi_id:
            resp = manager.delete_rule(i, file)
    return u_response(resp)


@router.delete(
    path="/disable/{bangumi_id}",
    response_model=APIResponse,
    dependencies=[Depends(get_current_user)],
)
def disable_rule(bangumi_id: str, file: bool = False):
    with TorrentManager() as manager:
        resp = manager.disable_rule(bangumi_id, file)
    return u_response(resp)


@router.delete(
    path="/disable/many/",
    response_model=APIResponse,
    dependencies=[Depends(get_current_user)],
)
def disable_many_rule(bangumi_id: list, file: bool = False):
    with TorrentManager() as manager:
        for i in bangumi_id:
            resp = manager.disable_rule(i, file)
    return u_response(resp)


@router.get(
    path="/enable/{bangumi_id}",
    response_model=APIResponse,
    dependencies=[Depends(get_current_user)],
)
def enable_rule(bangumi_id: str):
    with TorrentManager() as manager:
        resp = manager.enable_rule(bangumi_id)
    return u_response(resp)


@router.get(
    path="/refresh/poster/all",
    response_model=APIResponse,
    dependencies=[Depends(get_current_user)],
)
async def refresh_all_poster():
    with TorrentManager() as manager:
        resp = await manager.refresh_poster()
    return u_response(resp)


@router.get(
    path="/refresh/poster/{bangumi_id}",
    response_model=APIResponse,
    dependencies=[Depends(get_current_user)],
)
async def refresh_poster(bangumi_id: int):
    with TorrentManager() as manager:
        resp = await manager.refind_poster(bangumi_id)
    return u_response(resp)


@router.get(
    "/reset/all", response_model=APIResponse, dependencies=[Depends(get_current_user)]
)
def reset_all():
    with TorrentManager() as manager:
        manager.bangumi.delete_all()
        return JSONResponse(
            status_code=200,
            content={
                "msg_en": "Reset all rules successfully.",
                "msg_zh": "重置所有规则成功。",
            },
        )


@router.post(
    "/rename",
    response_model=APIResponse,
    dependencies=[Depends(get_current_user)],
)
def rename(data: Bangumi):
    with Renamer() as renamer:
        if data.save_path is None:
            return JSONResponse(
                status_code=400,
                content={
                    "msg_en": "No save path provided.",
                    "msg_zh": "缺少保存路径。",
                },
            )
        bangumi_name, _ = renamer._path_to_bangumi(data.save_path)
        renamer.rename(bangumi_name)
    return JSONResponse(
        status_code=200,
        content={
            "msg_en": f"Renamed '{data.official_title}' successfully.",
            "msg_zh": f"'{data.official_title}' 重命名成功。",
        },
    )
