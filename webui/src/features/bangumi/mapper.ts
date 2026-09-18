import type { BangumiAPI, BangumiRule } from './types';

export function toBangumiRule(bangumi: BangumiAPI): BangumiRule {
  return {
    ...bangumi,
    filter: bangumi.filter.split(','),
  };
}

export function toBangumiAPI(rule: BangumiRule): BangumiAPI {
  return {
    ...rule,
    filter: rule.filter.join(','),
  };
}
