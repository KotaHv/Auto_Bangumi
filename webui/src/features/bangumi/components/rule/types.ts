import type { BangumiData } from '../../types';

export interface AbRuleLayoutProps<T extends BangumiData = BangumiData> {
  rule: T;
  patch: <K extends keyof T>(key: K, value: T[K]) => void;
  patchNumber: (key: 'season' | 'offset', value: string) => void;
  copyRssLink: (url: string) => void;
}
