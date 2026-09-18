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
