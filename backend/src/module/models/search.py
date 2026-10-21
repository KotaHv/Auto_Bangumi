from typing import Annotated

from pydantic import BaseModel, Field

from .rss import RSSAnalysisOption, RSSItem


class SearchResult(BaseModel):
    options: Annotated[list[RSSAnalysisOption], Field(min_length=1)]
    rss: RSSItem
