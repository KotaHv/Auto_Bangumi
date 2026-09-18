import type { BangumiAPI, BangumiRule } from '@/features/bangumi/types';
import type { RSSAPI } from '@/features/rss/types/rss';

export interface SearchResultResponse {
  bangumi: BangumiAPI;
  rss: RSSAPI;
}

export interface SearchResult {
  bangumi: BangumiRule;
  rss: RSSAPI;
}

export type SearchFailureCode =
  | 'invalid_provider'
  | 'upstream_unavailable'
  | 'internal_error'
  | 'transport'
  | 'protocol';

export type SearchStreamEvent =
  | { type: 'result'; result: SearchResult }
  | { type: 'complete' }
  | { type: 'failure'; code: SearchFailureCode };

export type SearchState =
  | { status: 'idle'; results: [] }
  | { status: 'loading'; results: SearchResult[] }
  | { status: 'complete'; results: SearchResult[] }
  | {
      status: 'failed';
      results: SearchResult[];
      error: SearchFailureCode;
    };
