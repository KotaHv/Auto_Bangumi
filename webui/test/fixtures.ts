import type { BangumiData } from '../src/features/bangumi/types';
import type { RSSAPI } from '../src/features/rss/types/rss';

export function makeBangumi(overrides: Partial<BangumiData> = {}): BangumiData {
  return {
    added: false,
    deleted: false,
    dpi: '1080p',
    eps_collect: false,
    filter: ['1080p'],
    group_name: 'Group',
    id: null,
    official_title: 'Example',
    offset: 0,
    poster_link: null,
    rss_links: ['https://example.com/rss'],
    rule_name: null,
    save_path: null,
    season: 1,
    season_raw: 'S01',
    source: null,
    subtitle: null,
    title_raw: 'Example',
    year: '2024',
    ...overrides,
  };
}

export function makeRss(overrides: Partial<RSSAPI> = {}): RSSAPI {
  return {
    aggregate: false,
    enabled: true,
    id: null,
    name: null,
    parser: 'mikan',
    url: 'https://example.com/rss',
    ...overrides,
  };
}
