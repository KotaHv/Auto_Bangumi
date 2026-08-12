from fastapi import APIRouter, Depends, Query
from sse_starlette.sse import EventSourceResponse

from module.models import Bangumi
from module.searcher import SEARCH_CONFIG, SearchTorrent
from module.security.api import get_current_user

router = APIRouter(prefix="/search", tags=["search"])


@router.get(
    "/bangumi", response_model=list[Bangumi], dependencies=[Depends(get_current_user)]
)
async def search_torrents(site: str = "mikan", keywords: str | None = Query(None)):
    """
    Server Send Event for per Bangumi item
    """
    if not keywords:
        return []
    keyword_list = keywords.split(" ")

    async def event_stream():
        async with SearchTorrent() as st:
            async for item in st.analyse_keyword(keywords=keyword_list, site=site):
                yield item

    return EventSourceResponse(content=event_stream())


@router.get(
    "/provider", response_model=list[str], dependencies=[Depends(get_current_user)]
)
async def search_provider():
    return list(SEARCH_CONFIG.keys())
