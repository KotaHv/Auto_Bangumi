from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sse_starlette.sse import EventSourceResponse

from module.conf import SEARCH_CONFIG
from module.database.deps import DatabaseDep
from module.security.session import require_session
from module.service.search import SearchService

router = APIRouter(
    prefix="/search", tags=["search"], dependencies=[Depends(require_session)]
)


@router.get("/bangumi")
async def search_torrents(
    keywords: Annotated[str, Query(min_length=1, pattern=r"\S")],
    db: DatabaseDep,
    site: str = "mikan",
) -> EventSourceResponse:
    return EventSourceResponse(SearchService(db).search_events(keywords.split(), site))


@router.get("/provider", response_model=list[str])
async def search_provider():
    return list(SEARCH_CONFIG.keys())
