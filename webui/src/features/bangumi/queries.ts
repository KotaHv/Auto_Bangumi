import { queryOptions } from '@tanstack/react-query';
import { apiBangumi } from './api';
import { sortBangumiActiveFirst } from './sort';

export const bangumiKeys = {
  all: ['bangumi'] as const,
  list: () => [...bangumiKeys.all, 'list'] as const,
};

export function bangumiListOptions() {
  return queryOptions({
    queryKey: bangumiKeys.list(),
    queryFn: ({ signal }) => apiBangumi.getAll(signal),
    select: sortBangumiActiveFirst,
    meta: { requiresAuth: true },
  });
}
