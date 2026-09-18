import { sortActiveFirstByIdDesc } from '@/lib/sort';
import type { PersistedBangumiRule } from './types';

export function sortBangumiActiveFirst(items: PersistedBangumiRule[]) {
  return sortActiveFirstByIdDesc(items, (item) => !item.deleted);
}
