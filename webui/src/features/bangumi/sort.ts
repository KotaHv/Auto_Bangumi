import { sortActiveFirstByIdDesc } from '@/lib/sort';
import type { PersistedBangumi } from './types';

export function sortBangumiActiveFirst(items: PersistedBangumi[]) {
  return sortActiveFirstByIdDesc(items, (item) => !item.deleted);
}
