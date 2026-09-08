import type { BangumiAPI, BangumiRule } from './bangumi';
import type { RSS } from './rss';

export interface SearchResultResponse {
  bangumi: BangumiAPI;
  rss: RSS;
}

export interface SearchResult {
  bangumi: BangumiRule;
  rss: RSS;
}

export interface OrderedSearchResult {
  order: number;
  value: SearchResult;
}
