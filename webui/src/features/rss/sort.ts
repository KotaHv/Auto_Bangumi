import { sortActiveFirstByIdDesc } from '@/lib/sort';
import type { RSS } from './types/rss';

export function sortRssActiveFirst(items: RSS[]) {
  return sortActiveFirstByIdDesc(items, (item) => item.enabled);
}
