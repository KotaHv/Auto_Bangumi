import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import type { BangumiRule } from '#/bangumi';
import { message } from '@/components/message';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AbDynamicTags } from './basic/ab-dynamic-tags';
import { Separator } from '@/components/ui/separator';
import { copyText } from '@/lib/clipboard';

interface AbRuleProps {
  rule: BangumiRule;
  onChange?: (rule: BangumiRule) => void;
}

export function AbRule({ rule, onChange }: AbRuleProps) {
  const { t } = useTranslation();

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

  return (
    <div>
      <div className="space-y-3 sm:hidden">
        <div className="border-border/70 focus-within:border-brand flex min-w-0 items-end border-b">
          <Input
            value={rule.official_title}
            onChange={(e) => patch('official_title', e.target.value)}
            type="text"
            placeholder={t('homepage.rule.official_title')}
            className="font-display h-6 rounded-none border-0 bg-transparent px-0 pb-0.5 text-center font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-lg dark:bg-transparent"
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
              <Input
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
              <Input
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
              <Input
                value={rule.offset}
                onChange={(e) => patchNumber('offset', e.target.value)}
                type="number"
                className="flex-1"
              />
            </div>

            <div className="flex items-start gap-2">
              <FieldLabel className="w-14 shrink-0">
                {t('homepage.rule.exclude')}
              </FieldLabel>
              <div className="min-w-0 flex-1">
                <AbDynamicTags
                  value={rule.filter}
                  onChange={(value) => patch('filter', value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden items-start gap-4 sm:flex">
        {rule.poster_link ? (
          <div className="bg-muted/30 w-28 shrink-0 overflow-hidden rounded-lg">
            <img src={rule.poster_link} alt="" className="block w-full" />
          </div>
        ) : (
          <div className="bg-muted/30 aspect-5/7 w-28 shrink-0 rounded-lg border border-dashed" />
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div className="border-border/70 focus-within:border-brand flex min-w-0 items-end border-b">
            <Input
              value={rule.official_title}
              onChange={(e) => patch('official_title', e.target.value)}
              type="text"
              placeholder={t('homepage.rule.official_title')}
              className="font-display h-6 rounded-none border-0 bg-transparent px-0 pb-0.5 font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-lg dark:bg-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel>{t('homepage.rule.year')}</FieldLabel>
              <Input
                value={rule.year ?? ''}
                onChange={(e) => patch('year', e.target.value)}
                type="text"
              />
            </Field>

            <Field>
              <FieldLabel>{t('homepage.rule.season')}</FieldLabel>
              <Input
                value={rule.season}
                onChange={(e) => patchNumber('season', e.target.value)}
                type="number"
              />
            </Field>

            <Field>
              <FieldLabel>{t('homepage.rule.offset')}</FieldLabel>
              <Input
                value={rule.offset}
                onChange={(e) => patchNumber('offset', e.target.value)}
                type="number"
              />
            </Field>
          </div>

          <Field orientation="horizontal" className="items-start gap-3">
            <FieldLabel className="w-fit! flex-none!">
              {t('homepage.rule.exclude')}
            </FieldLabel>
            <div className="min-w-0 flex-1">
              <AbDynamicTags
                value={rule.filter}
                onChange={(value) => patch('filter', value)}
              />
            </div>
          </Field>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="text-muted-foreground space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0">{t('homepage.rule.group')}</span>
          <span
            className="block min-w-0 flex-1 truncate"
            title={rule.group_name || '-'}
          >
            {rule.group_name || '-'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0">{t('homepage.rule.rss_link')}</span>
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
