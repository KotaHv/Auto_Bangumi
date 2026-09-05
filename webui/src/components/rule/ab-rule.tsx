import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import type { BangumiRule } from '#/bangumi';
import { message } from '@/lib/message';
import { copyText } from '@/lib/clipboard';
import { AbRuleMobile } from './ab-rule-mobile';
import { AbRulePc } from './ab-rule-pc';

interface AbRuleProps {
  rule: BangumiRule;
  onChange?: (rule: BangumiRule) => void;
}

export function AbRule({ rule, onChange }: AbRuleProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  function patch(key: keyof BangumiRule, value: unknown) {
    onChange?.({ ...rule, [key]: value });
  }

  function patchNumber(key: 'season' | 'offset', value: string) {
    const n = Number(value);
    patch(key, Number.isNaN(n) ? 0 : n);
  }

  async function copyRssLink() {
    if (await copyText(rule.rss_link)) {
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
    <AbRulePc {...layoutProps} />
  );
}
