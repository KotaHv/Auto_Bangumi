import type { RSS } from './rss';

export interface RSSLayoutProps {
  rss: RSS[];
  selectedRSS: number[];
  setSelectedRSS: (ids: number[]) => void;
  enableSelected: () => Promise<void>;
  disableSelected: () => Promise<void>;
  deleteSelected: () => Promise<void>;
  refreshSelected: () => Promise<void>;
}
