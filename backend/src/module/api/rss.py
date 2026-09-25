from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from module.database import Database
from module.models import APIResponse, Bangumi, RSSItem, RSSUpdate, Torrent
from module.rss import RSSAnalyser, RSSEngine
from module.security.session import require_session
from module.service.rss import RssService
from module.service.season import SeasonService

from .response import u_response

router = APIRouter(prefix="/rss", tags=["rss"], dependencies=[Depends(require_session)])


@router.get(path="", response_model=list[RSSItem])
async def get_rss():
    async with RSSEngine() as engine:
        return await engine.rss.search_all()


@router.post(path="/add", response_model=APIResponse)
async def add_rss(rss: RSSItem):
    async with Database() as session:
        result = await RssService(session).add_rss(
            rss.url, rss.name, rss.aggregate, rss.parser
        )
    return u_response(result)


@router.post(
    path="/enable/many",
    response_model=APIResponse,
)
async def enable_many_rss(
    rss_ids: list[int],
):
    async with Database() as session:
        result = await RssService(session).set_enabled_many(rss_ids, True)
    return u_response(result)


@router.delete(
    path="/delete/{rss_id}",
    response_model=APIResponse,
)
async def delete_rss(rss_id: int):
    async with Database() as session:
        result = await RssService(session).delete_one(rss_id)
    return u_response(result)


@router.post(
    path="/delete/many",
    response_model=APIResponse,
)
async def delete_many_rss(
    rss_ids: list[int],
):
    async with Database() as session:
        result = await RssService(session).delete_many(rss_ids)
    return u_response(result)


@router.patch(
    path="/disable/{rss_id}",
    response_model=APIResponse,
)
async def disable_rss(rss_id: int):
    async with Database() as session:
        if await RssService(session).set_enabled(rss_id, False):
            return JSONResponse(
                status_code=200,
                content={
                    "msg_en": "Disable RSS successfully.",
                    "msg_zh": "禁用 RSS 成功。",
                },
            )
        else:
            return JSONResponse(
                status_code=406,
                content={
                    "msg_en": "Disable RSS failed.",
                    "msg_zh": "禁用 RSS 失败。",
                },
            )


@router.post(
    path="/disable/many",
    response_model=APIResponse,
)
async def disable_many_rss(rss_ids: list[int]):
    async with Database() as session:
        result = await RssService(session).set_enabled_many(rss_ids, False)
    return u_response(result)


@router.patch(
    path="/update/{rss_id}",
    response_model=APIResponse,
)
async def update_rss(
    rss_id: int,
    data: RSSUpdate,
):
    async with Database() as session:
        if await RssService(session).update(rss_id, data):
            return JSONResponse(
                status_code=200,
                content={
                    "msg_en": "Update RSS successfully.",
                    "msg_zh": "更新 RSS 成功。",
                },
            )
        else:
            return JSONResponse(
                status_code=406,
                content={
                    "msg_en": "Update RSS failed.",
                    "msg_zh": "更新 RSS 失败。",
                },
            )


@router.post(
    path="/refresh/all",
    response_model=APIResponse,
)
async def refresh_all():
    async with Database() as session:
        await RssService(session).refresh_rss()
    return JSONResponse(
        status_code=200,
        content={
            "msg_en": "Refresh all RSS successfully.",
            "msg_zh": "刷新 RSS 成功。",
        },
    )


@router.post(
    path="/refresh/{rss_id}",
    response_model=APIResponse,
)
async def refresh_rss(rss_id: int):
    async with Database() as session:
        await RssService(session).refresh_rss(rss_id)
    return JSONResponse(
        status_code=200,
        content={
            "msg_en": "Refresh RSS successfully.",
            "msg_zh": "刷新 RSS 成功。",
        },
    )


@router.get(
    path="/torrent/{rss_id}",
    response_model=list[Torrent],
)
async def get_torrent(
    rss_id: int,
):
    async with RSSEngine() as engine:
        return await engine.get_rss_torrents(rss_id)


# Old API
analyser = RSSAnalyser()


@router.post("/analysis", response_model=Bangumi)
async def analysis(rss: RSSItem):
    data = await analyser.link_to_data(rss)
    if isinstance(data, Bangumi):
        return data
    else:
        return u_response(data)


@router.post("/collect", response_model=APIResponse)
async def download_collection(data: Bangumi):
    async with Database() as session:
        resp = await SeasonService(session).collect_season(data, data.rss_link)
        return u_response(resp)


@router.post("/subscribe", response_model=APIResponse)
async def subscribe(data: Bangumi, rss: RSSItem):
    async with Database() as session:
        resp = await SeasonService(session).subscribe_season(data, parser=rss.parser)
        return u_response(resp)


@router.post(
    "/force-collect",
    response_model=APIResponse,
)
async def force_collect(data: Bangumi):
    async with Database() as session:
        resp = await SeasonService(session).force_collect(data)
    return u_response(resp)
