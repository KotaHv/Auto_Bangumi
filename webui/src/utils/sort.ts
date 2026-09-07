import { BangumiRule } from '@/types/bangumi';
import { RSS } from '@/types/rss';

function sortActiveFirstByIdDesc<T extends { id: number }>(
  items: T[],
  isActive: (item: T) => boolean,
) {
  return [
    ...items.filter(isActive).sort((a, b) => b.id - a.id),
    ...items.filter((item) => !isActive(item)).sort((a, b) => b.id - a.id),
  ];
}

export function sortBangumiActiveFirst(items: BangumiRule[]) {
  return sortActiveFirstByIdDesc(items, (item) => !item.deleted);
}

export function sortRssActiveFirst(items: RSS[]) {
  return sortActiveFirstByIdDesc(items, (item) => item.enabled);
}
