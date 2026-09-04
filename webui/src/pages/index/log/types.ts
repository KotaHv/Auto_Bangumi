import type { RefObject } from 'react';

export interface LogLine {
  index: number;
  date: string;
  type: string;
  module: string;
  content: string;
}

export type LogLevelFilter = 'ALL' | 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
export type LogLineLimit = number | null;

export interface LogLayoutProps {
  log: LogLine[];
  visibleLog: LogLine[];
  loaded: boolean;
  loading: false | 'visible' | 'silent';
  debugEnable: boolean;
  filterLevel: LogLevelFilter;
  setFilterLevel: (level: LogLevelFilter) => void;
  lineLimit: LogLineLimit;
  setLineLimit: (limit: LogLineLimit) => void;
  pollingActive: boolean;
  togglePolling: () => void;
  logContainerRef: RefObject<HTMLElement | null>;
  getLog: (lineLimit?: LogLineLimit, showLoading?: boolean) => Promise<void>;
  onReset: () => void;
  copy: () => Promise<void>;
}
