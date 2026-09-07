import { queryOptions } from '@tanstack/react-query';
import { apiBangumi } from '@/api/bangumi';
import { apiConfig } from '@/api/config';
import { apiLog } from '@/api/log';
import { apiProgram } from '@/api/program';
import { apiRSS } from '@/api/rss';
import { apiSearch } from '@/api/search';
import type { SearchResult } from '@/types/bangumi';
import { sortBangumiActiveFirst, sortRssActiveFirst } from '@/utils/sort';

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

export const configKeys = {
  all: ['config'] as const,
  current: () => [...configKeys.all, 'current'] as const,
};

export function configOptions() {
  return queryOptions({
    queryKey: configKeys.current(),
    queryFn: ({ signal }) => apiConfig.getConfig(signal),
    meta: { requiresAuth: true },
  });
}

export const logKeys = {
  all: ['log'] as const,
  lines: (lineLimit: number | null) => [...logKeys.all, lineLimit] as const,
};

export function logOptions(lineLimit: number | null) {
  return queryOptions({
    queryKey: logKeys.lines(lineLimit),
    queryFn: ({ signal }) => apiLog.getLog(lineLimit, signal),
    meta: { requiresAuth: true },
  });
}

export const programKeys = {
  all: ['program'] as const,
  status: () => [...programKeys.all, 'status'] as const,
};

export function programStatusOptions() {
  return queryOptions({
    queryKey: programKeys.status(),
    queryFn: ({ signal }) => apiProgram.status(signal),
    refetchInterval: 3000,
    meta: { requiresAuth: true },
  });
}

export const searchKeys = {
  all: ['search'] as const,
  providers: () => [...searchKeys.all, 'providers'] as const,
  results: (keyword: string, provider: string) =>
    [...searchKeys.all, 'results', { keyword, provider }] as const,
};

export function emptySearchResultsOptions(keyword: string, provider: string) {
  return queryOptions<SearchResult[], Error, SearchResult[]>({
    queryKey: searchKeys.results(keyword, provider),
    queryFn: () => Promise.resolve([]),
    enabled: false,
    meta: { requiresAuth: true },
  });
}

export function searchProviderOptions() {
  return queryOptions({
    queryKey: searchKeys.providers(),
    queryFn: ({ signal }) => apiSearch.getProvider(signal),
    meta: { requiresAuth: true },
  });
}
