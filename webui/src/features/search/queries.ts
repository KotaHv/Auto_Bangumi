import { queryOptions } from '@tanstack/react-query';
import { apiSearch } from './api';

export const searchKeys = {
  all: ['search'] as const,
  providers: () => [...searchKeys.all, 'providers'] as const,
};

export function searchProviderOptions() {
  return queryOptions({
    queryKey: searchKeys.providers(),
    queryFn: ({ signal }) => apiSearch.getProvider(signal),
    meta: { requiresAuth: true },
  });
}
