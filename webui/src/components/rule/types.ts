import type { BangumiRule } from '@/types/bangumi';

export interface AbRuleLayoutProps {
  rule: BangumiRule;
  patch: (key: keyof BangumiRule, value: unknown) => void;
  patchNumber: (key: 'season' | 'offset', value: string) => void;
  copyRssLink: () => void;
}
