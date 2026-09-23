import type { LogFilters } from './types';

export function hasActiveFilters(filters: LogFilters): boolean {
  return Boolean(
    filters.level ||
    filters.start ||
    filters.end ||
    filters.module ||
    filters.query,
  );
}
