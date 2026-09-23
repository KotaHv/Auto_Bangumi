import type { ReactNode, RefObject } from 'react';

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

export interface LogViewSlots {
  modeSwitcher: ReactNode;
  loadedIcon: ReactNode;
  loadError: ReactNode;
  listEnd: ReactNode;
  overlay: ReactNode;
  moreActions: ReactNode;
  footerActions: ReactNode;
}

export type LogViewProps = {
  entries: LogEntry[];
  loaded: boolean;
  loading: LogLoadingState;
  filters: LogFilters;
  setFilters: (filters: LogFilters) => void;
  logContainerRef: RefObject<HTMLElement | null>;
  onLogScroll: () => void;
  slots: LogViewSlots;
};
