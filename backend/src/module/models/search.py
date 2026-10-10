from pydantic import BaseModel

from .bangumi import BangumiData
from .rss import RSSItem


class SearchResult(BaseModel):
    bangumi: BangumiData
    rss: RSSItem
