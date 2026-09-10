import { queryOptions } from '@tanstack/react-query';
import { apiRSS } from './api';
import { sortRssActiveFirst } from './sort';

export const rssKeys = {
  all: ['rss'] as const,
  list: () => [...rssKeys.all, 'list'] as const,
};

export function rssListOptions() {
  return queryOptions({
    queryKey: rssKeys.list(),
    queryFn: ({ signal }) => apiRSS.get(signal),
    select: sortRssActiveFirst,
    meta: { requiresAuth: true },
  });
}
