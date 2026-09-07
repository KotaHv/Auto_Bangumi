import type { RSS } from '@/types/rss';

export interface RSSLayoutProps {
  rss: RSS[];
  selectedRSS: number[];
  setSelectedRSS: (ids: number[]) => void;
  enableSelected: () => Promise<void>;
  disableSelected: () => Promise<void>;
  deleteSelected: () => Promise<void>;
  refreshSelected: () => Promise<void>;
}
