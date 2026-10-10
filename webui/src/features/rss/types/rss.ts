import type { BangumiData, PersistedBangumi } from '@/features/bangumi/types';

/** Wire response from `backend/src/module/models/rss.py`. */
export interface RSSAPI {
  id: number | null;
  name: string | null;
  url: string;
  aggregate: boolean;
  parser: string;
  enabled: boolean;
}

export interface RSSDraft extends Omit<RSSAPI, 'name'> {
  name: string;
}

export interface RSS extends RSSAPI {
  id: number;
}

export type RSSAnalysisOptionType = 'exact_match' | 'candidate' | 'create';

export type RSSAnalysisOptionAPI =
  | { type: 'exact_match'; bangumi: PersistedBangumi }
  | { type: 'candidate'; bangumi: PersistedBangumi }
  | { type: 'create'; bangumi: BangumiData };

export type NonEmptyArray<T> = [T, ...T[]];

export interface RSSAnalysisAPI {
  options: NonEmptyArray<RSSAnalysisOptionAPI>;
}

export type RSSAnalysisOption = RSSAnalysisOptionAPI;
export type RSSAnalysis = RSSAnalysisAPI;
