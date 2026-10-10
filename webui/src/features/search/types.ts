import type { BangumiData } from '@/features/bangumi/types';
import type { RSSAPI } from '@/features/rss/types/rss';

export interface SearchResultResponse {
  bangumi: BangumiData;
  rss: RSSAPI;
}

export interface SearchResult {
  bangumi: BangumiData;
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
