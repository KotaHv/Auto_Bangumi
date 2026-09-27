from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from module.models import APIResponse, Bangumi, RSSItem
from module.rss import RSSAnalyser
from module.security.session import require_session
from module.service.rss import RssService
from module.service.season import SeasonService

from .deps import DatabaseDep
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
async def download_collection(data: Bangumi, db: DatabaseDep):
    resp = await SeasonService(db).collect_season(data, data.rss_link)
    return u_response(resp)


@router.post("/subscribe", response_model=APIResponse)
async def subscribe(data: Bangumi, rss: RSSItem, db: DatabaseDep):
    resp = await SeasonService(db).subscribe_season(data, parser=rss.parser)
    return u_response(resp)


@router.post(
    "/force-collect",
    response_model=APIResponse,
)
async def force_collect(data: Bangumi, db: DatabaseDep):
    resp = await SeasonService(db).force_collect(data)
    return u_response(resp)
