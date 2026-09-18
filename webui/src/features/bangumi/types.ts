/**
 * Wire response from `backend/src/module/models/bangumi.py`.
 */
export interface BangumiAPI {
  added: boolean;
  deleted: boolean;
  dpi: string | null;
  eps_collect: boolean;
  filter: string;
  group_name: string | null;
  id: number | null;
  official_title: string;
  offset: number;
  poster_link: string | null;
  rss_link: string;
  rule_name: string | null;
  save_path: string | null;
  season: number;
  season_raw: string | null;
  source: string | null;
  subtitle: string | null;
  title_raw: string;
  year: string | null;
}

export interface BangumiRule extends Omit<BangumiAPI, 'filter'> {
  filter: string[];
}

export type PersistedBangumiRule = BangumiRule & { id: number };
