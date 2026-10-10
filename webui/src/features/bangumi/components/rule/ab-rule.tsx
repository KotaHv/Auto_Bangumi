import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import type { BangumiData } from '../../types';
import { message } from '@/lib/message';
import { copyText } from '@/lib/clipboard';
import { AbRuleMobile } from './rule-mobile';
import { AbRuleDesktop } from './rule-desktop';

interface AbRuleProps<T extends BangumiData> {
  rule: T;
  onChange: (rule: T) => void;
}

export function AbRule<T extends BangumiData>({
  rule,
  onChange,
}: AbRuleProps<T>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  function patch<K extends keyof T>(key: K, value: T[K]) {
    onChange({ ...rule, [key]: value });
  }

  function patchNumber(key: 'season' | 'offset', value: string) {
    const n = Number(value);
    patch(key, Number.isNaN(n) ? 0 : n);
  }

  async function copyRssLink(url: string) {
    if (await copyText(url)) {
      message.success(t('notify.copy_success'));
    } else {
      message.error(t('notify.copy_failed'));
    }
  }

  const layoutProps = {
    rule,
    patch,
    patchNumber,
    copyRssLink,
  };

  return isMobile ? (
    <AbRuleMobile {...layoutProps} />
  ) : (
    <AbRuleDesktop {...layoutProps} />
  );
}
