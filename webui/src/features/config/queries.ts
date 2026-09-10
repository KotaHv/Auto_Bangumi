import { queryOptions } from '@tanstack/react-query';
import { apiConfig } from './api';

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
