import { useEffect } from 'react';
import { useRSSStore } from '@/store/rss';
import { useIsPc } from '@/hooks/use-is-pc';
import { RSSMobile } from './mobile';
import { RSSPc } from './pc';
import type { RSSLayoutProps } from './types';

export default function RSSPage() {
  const rss = useRSSStore((s) => s.rss);
  const selectedRSS = useRSSStore((s) => s.selectedRSS);
  const setSelectedRSS = useRSSStore((s) => s.setSelectedRSS);
  const getAll = useRSSStore((s) => s.getAll);
  const enableSelected = useRSSStore((s) => s.enableSelected);
  const disableSelected = useRSSStore((s) => s.disableSelected);
  const deleteSelected = useRSSStore((s) => s.deleteSelected);
  const refreshSelected = useRSSStore((s) => s.refreshSelected);
  const isPc = useIsPc();

  useEffect(() => {
    getAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const props: RSSLayoutProps = {
    rss,
    selectedRSS,
    setSelectedRSS,
    enableSelected,
    disableSelected,
    deleteSelected,
    refreshSelected,
  };

  return isPc ? <RSSPc {...props} /> : <RSSMobile {...props} />;
}
