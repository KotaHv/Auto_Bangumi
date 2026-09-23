import type { LogFilters } from './types';

export const EMPTY_LOG_FILTERS: LogFilters = {
  level: null,
  start: null,
  end: null,
  module: '',
  query: '',
};

export const LOG_LEVELS = ['DEBUG', 'INFO', 'WARNING', 'ERROR'] as const;

// Sent explicitly on every request. Keep PAGE_SIZE at or below the backend's
// MAX_LIMIT (500), or the backend will reject the request.
export const PAGE_SIZE = 100;
