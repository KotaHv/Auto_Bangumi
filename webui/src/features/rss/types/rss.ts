import type {
  BangumiAPI,
  BangumiRule,
  PersistedBangumiRule,
} from '@/features/bangumi/types';

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
  | { type: 'exact_match'; bangumi: BangumiAPI & { id: number } }
  | { type: 'candidate'; bangumi: BangumiAPI }
  | { type: 'create'; bangumi: BangumiAPI };

export type NonEmptyArray<T> = [T, ...T[]];

export interface RSSAnalysisAPI {
  options: NonEmptyArray<RSSAnalysisOptionAPI>;
}

export type RSSAnalysisOption =
  | { type: 'exact_match'; bangumi: PersistedBangumiRule }
  | { type: 'candidate'; bangumi: BangumiRule }
  | { type: 'create'; bangumi: BangumiRule };

export interface RSSAnalysis {
  options: NonEmptyArray<RSSAnalysisOption>;
}
