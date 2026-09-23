import type { RefObject } from 'react';

export interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  module: string | null;
  function: string;
  line: number;
  exception: string | null;
}

export interface LogPage {
  items: LogEntry[];
  next_cursor: number | null;
  has_more: boolean;
}

export interface ClearLogResult {
  deleted_count: number;
}

export interface LogFilters {
  level: string | null;
  start: string | null;
  end: string | null;
  module: string;
  query: string;
}

export type LogLoadingState = 'idle' | 'loading' | 'refreshing';

export type LogLayoutProps = {
  entries: LogEntry[];
  loaded: boolean;
  loading: LogLoadingState;
  filters: LogFilters;
  setFilters: (filters: LogFilters) => void;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreFailed: boolean;
  onLoadMore: () => void;
  logContainerRef: RefObject<HTMLElement | null>;
  onReset: () => void;
  copy: () => Promise<void>;
};
