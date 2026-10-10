export interface BangumiData {
  added: boolean;
  deleted: boolean;
  dpi: string | null;
  eps_collect: boolean;
  filter: string[];
  group_name: string | null;
  id: number | null;
  official_title: string;
  offset: number;
  poster_link: string | null;
  rss_links: string[];
  rule_name: string | null;
  save_path: string | null;
  season: number;
  season_raw: string | null;
  source: string | null;
  subtitle: string | null;
  title_raw: string;
  year: string | null;
}

export type PersistedBangumi = Omit<BangumiData, 'id'> & { id: number };
