import { infiniteQueryOptions } from '@tanstack/react-query';
import { apiLog } from './api';
import type { LogFilters, LogPage } from './types';

export const logKeys = {
  all: ['log'] as const,
  pages: (filters: LogFilters) => [...logKeys.all, 'pages', filters] as const,
};

export function logPagesOptions(filters: LogFilters) {
  return infiniteQueryOptions({
    queryKey: logKeys.pages(filters),
    queryFn: ({ pageParam, signal }) =>
      apiLog.getLog(filters, pageParam, signal),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage: LogPage) => lastPage.next_cursor,
    meta: { requiresAuth: true },
  });
}
