import { useIsDesktop } from '@/hooks/use-desktop';
import { ConfigDesktop } from './desktop';
import { ConfigMobile } from './mobile';
import type { ConfigLayoutProps } from '../../types/page';

export function ConfigPageLayout(props: ConfigLayoutProps) {
  const isDesktop = useIsDesktop();

  return isDesktop ? <ConfigDesktop {...props} /> : <ConfigMobile {...props} />;
}
