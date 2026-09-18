import json
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger
from sse_starlette.sse import EventSourceResponse

from module.network import UpstreamUnavailableError
from module.searcher import SEARCH_CONFIG, SearchTorrent
from module.security.session import require_session

router = APIRouter(
    prefix="/search", tags=["search"], dependencies=[Depends(require_session)]
)


@router.get("/bangumi")
async def search_torrents(
    keywords: Annotated[str, Query(min_length=1)],
    site: str = "mikan",
) -> EventSourceResponse:
    keywords = keywords.strip()
    if not keywords:
        raise HTTPException(status_code=422, detail="keywords must not be blank")

    async def event_stream() -> AsyncIterator[dict[str, str]]:
        if site not in SEARCH_CONFIG:
            yield {"event": "failure", "data": json.dumps({"code": "invalid_provider"})}
            return

        try:
            async with SearchTorrent() as searcher:
                async for item in searcher.analyse_keyword(
                    keywords=keywords.split(), site=site
                ):
                    yield {"data": item}
        except UpstreamUnavailableError:
            yield {
                "event": "failure",
                "data": json.dumps({"code": "upstream_unavailable"}),
            }
        except Exception:
            logger.exception("[Search] Search failed")
            yield {"event": "failure", "data": json.dumps({"code": "internal_error"})}
        else:
            yield {"event": "complete", "data": ""}

    return EventSourceResponse(event_stream())


@router.get("/provider", response_model=list[str])
async def search_provider():
    return list(SEARCH_CONFIG.keys())
