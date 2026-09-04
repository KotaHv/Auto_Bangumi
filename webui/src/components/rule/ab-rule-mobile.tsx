import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import { FieldLabel } from '@/components/ui/field';
import { AbInput } from '@/components/basic/ab-input';
import { Separator } from '@/components/ui/separator';
import { AbExcludeField } from './ab-exclude-field';
import type { AbRuleLayoutProps } from './types';

export function AbRuleMobile({
  rule,
  patch,
  patchNumber,
  copyRssLink,
}: AbRuleLayoutProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex flex-col gap-3">
        <div className="border-border/70 focus-within:border-brand flex min-w-0 items-end border-b">
          <AbInput
            variant="title"
            value={rule.official_title}
            onChange={(e) => patch('official_title', e.target.value)}
            type="text"
            placeholder={t('homepage.rule.official_title')}
            className="text-center"
          />
        </div>

        <div className="flex items-start gap-4">
          {rule.poster_link ? (
            <div className="bg-muted/30 w-28 shrink-0 overflow-hidden rounded-lg">
              <img src={rule.poster_link} alt="" className="block w-full" />
            </div>
          ) : (
            <div className="bg-muted/30 aspect-5/7 w-28 shrink-0 rounded-lg border border-dashed" />
          )}

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <FieldLabel className="w-14 shrink-0">
                {t('homepage.rule.year')}
              </FieldLabel>
              <AbInput
                variant="default"
                value={rule.year ?? ''}
                onChange={(e) => patch('year', e.target.value)}
                type="text"
                className="flex-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <FieldLabel className="w-14 shrink-0">
                {t('homepage.rule.season')}
              </FieldLabel>
              <AbInput
                variant="default"
                value={rule.season}
                onChange={(e) => patchNumber('season', e.target.value)}
                type="number"
                className="flex-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <FieldLabel className="w-14 shrink-0">
                {t('homepage.rule.offset')}
              </FieldLabel>
              <AbInput
                variant="default"
                value={rule.offset}
                onChange={(e) => patchNumber('offset', e.target.value)}
                type="number"
                className="flex-1"
              />
            </div>

            <AbExcludeField
              layout="mobile"
              value={rule.filter}
              onChange={(value) => patch('filter', value)}
            />
          </div>
        </div>
      </div>

      <Separator className="my-3" />

      <div className="text-muted-foreground flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0">{t('homepage.rule.group')}</span>
          <span
            className="block min-w-0 flex-1 truncate"
            title={rule.group_name || '-'}
          >
            {rule.group_name || '-'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0">{t('homepage.rule.rss_link')}</span>
          <span
            className="block min-w-0 flex-1 truncate"
            title={rule.rss_link || '—'}
          >
            {rule.rss_link || '—'}
          </span>
          {rule.rss_link && (
            <button
              type="button"
              aria-label={t('notify.copy')}
              title={t('notify.copy')}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-brand/40 flex size-4 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2"
              onClick={copyRssLink}
            >
              <Copy className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
