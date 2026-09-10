import { sortActiveFirstByIdDesc } from '@/lib/sort';
import type { BangumiRule } from './types';

export function sortBangumiActiveFirst(items: BangumiRule[]) {
  return sortActiveFirstByIdDesc(items, (item) => !item.deleted);
}
