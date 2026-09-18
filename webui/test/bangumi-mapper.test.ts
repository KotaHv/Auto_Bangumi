import { describe, expect, test } from 'bun:test';
import { toBangumiAPI, toBangumiRule } from '../src/features/bangumi/mapper';
import type { BangumiAPI } from '../src/features/bangumi/types';

const bangumiWire = {
  added: false,
  deleted: false,
  dpi: null,
  eps_collect: false,
  filter: '1080p,中文字幕',
  group_name: null,
  id: null,
  official_title: 'Example',
  offset: 0,
  poster_link: null,
  rss_link: 'https://example.com/rss',
  rule_name: null,
  save_path: null,
  season: 1,
  season_raw: null,
  source: null,
  subtitle: null,
  title_raw: 'Example',
  year: null,
} satisfies BangumiAPI;

describe('wire mappers', () => {
  test('adapts nullable Bangumi wire data without fabricating values', () => {
    const rule = toBangumiRule(bangumiWire);

    expect(rule.filter).toEqual(['1080p', '中文字幕']);
    expect(rule).toMatchObject({
      dpi: null,
      group_name: null,
      id: null,
      poster_link: null,
      rule_name: null,
      save_path: null,
      season_raw: null,
      source: null,
      subtitle: null,
      year: null,
    });
  });

  test('serializes editable Bangumi filters for outgoing requests', () => {
    const rule = {
      ...toBangumiRule(bangumiWire),
      filter: ['720p', '1080p'],
    };

    expect(toBangumiAPI(rule)).toEqual({
      ...bangumiWire,
      filter: '720p,1080p',
    });
  });
});
