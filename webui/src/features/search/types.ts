import type { BangumiAPI, BangumiRule } from '@/features/bangumi/types';
import type { RSS } from '@/features/rss/types/rss';

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
