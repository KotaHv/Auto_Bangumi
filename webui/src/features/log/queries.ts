import { queryOptions } from '@tanstack/react-query';
import { apiLog } from './api';

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
