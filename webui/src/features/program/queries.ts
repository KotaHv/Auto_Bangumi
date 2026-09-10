import { queryOptions } from '@tanstack/react-query';
import { apiProgram } from './api';

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
