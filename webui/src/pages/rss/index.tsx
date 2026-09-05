import { useEffect } from 'react';
import { useRSSStore } from '@/store/rss';
import { useIsDesktop } from '@/hooks/use-desktop';
import { RSSMobile } from './mobile';
import { RSSDesktop } from './desktop';
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
  const isDesktop = useIsDesktop();

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

  return isDesktop ? <RSSDesktop {...props} /> : <RSSMobile {...props} />;
}
