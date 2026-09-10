from pydantic import BaseModel

from .bangumi import Bangumi
from .rss import RSSItem


class SearchResult(BaseModel):
    bangumi: Bangumi
    rss: RSSItem
