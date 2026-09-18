import type { RSS } from './rss';

export type RSSBulkAction = 'enable' | 'disable' | 'delete' | 'refresh';

export interface RSSLayoutProps {
  rss: RSS[];
  loading: boolean;
  actionPending: boolean;
  pendingAction: RSSBulkAction | null;
  selectedRSS: number[];
  setSelectedRSS: (ids: number[]) => void;
  enableSelected: () => Promise<void>;
  disableSelected: () => Promise<void>;
  deleteSelected: () => Promise<void>;
  refreshSelected: () => Promise<void>;
}
