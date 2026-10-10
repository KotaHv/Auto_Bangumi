from typing import Annotated

from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse

from module.database.deps import DatabaseDep
from module.models import (
    APIResponse,
    BangumiData,
    ResponseModel,
    RSSAnalysisResult,
    RSSItem,
)
from module.security.session import require_session
from module.service.rss import RssService
from module.service.season import SeasonService

from .response import u_response

router = APIRouter(prefix="/rss", tags=["rss"], dependencies=[Depends(require_session)])


@router.get(path="", response_model=list[RSSItem])
async def get_rss(db: DatabaseDep):
    return await RssService(db).search_all()


@router.post(path="/add", response_model=APIResponse)
async def add_rss(rss: RSSItem, db: DatabaseDep):
    result = await RssService(db).add_rss(rss.url, rss.name, rss.aggregate, rss.parser)
    return u_response(result)


@router.patch(
    path="/enable/many",
    response_model=APIResponse,
)
async def enable_many_rss(
    rss_ids: list[int],
    db: DatabaseDep,
):
    result = await RssService(db).set_enabled_many(rss_ids, True)
    return u_response(result)


@router.delete(
    path="/delete/many",
    response_model=APIResponse,
)
async def delete_many_rss(
    rss_ids: list[int],
    db: DatabaseDep,
):
    result = await RssService(db).delete_many(rss_ids)
    return u_response(result)


@router.patch(
    path="/disable/many",
    response_model=APIResponse,
)
async def disable_many_rss(rss_ids: list[int], db: DatabaseDep):
    result = await RssService(db).set_enabled_many(rss_ids, False)
    return u_response(result)


@router.post(
    path="/refresh/all",
    response_model=APIResponse,
)
async def refresh_all(db: DatabaseDep):
    await RssService(db).refresh_rss()
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
async def refresh_rss(rss_id: int, db: DatabaseDep):
    await RssService(db).refresh_rss(rss_id)
    return JSONResponse(
        status_code=200,
        content={
            "msg_en": "Refresh RSS successfully.",
            "msg_zh": "刷新 RSS 成功。",
        },
    )


@router.post("/analysis", response_model=RSSAnalysisResult)
async def analysis(rss: RSSItem, db: DatabaseDep):
    result = await RssService(db).analyze_feed(rss)
    if isinstance(result, ResponseModel):
        return u_response(result)
    return result


@router.post("/collect", response_model=APIResponse)
async def download_collection(data: BangumiData, db: DatabaseDep):
    bangumi = data.to_bangumi()
    resp = await SeasonService(db).collect_season(bangumi, bangumi.rss_link)
    return u_response(resp)


@router.post("/subscribe/new", response_model=APIResponse)
async def subscribe(data: BangumiData, rss: RSSItem, db: DatabaseDep):
    resp = await SeasonService(db).subscribe_season(data.to_bangumi(), rss)
    return u_response(resp)


@router.post("/subscribe/existing", response_model=APIResponse)
async def add_to_bangumi(
    rss: RSSItem, bangumi_id: Annotated[int, Body()], db: DatabaseDep
):
    resp = await SeasonService(db).subscribe_existing(rss, bangumi_id)
    return u_response(resp)


@router.post(
    "/force-collect",
    response_model=APIResponse,
)
async def force_collect(data: BangumiData, db: DatabaseDep):
    resp = await SeasonService(db).force_collect(data.to_bangumi())
    return u_response(resp)
