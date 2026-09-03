import { useTranslation } from 'react-i18next';
import { FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AbExcludeField } from './ab-exclude-field';
import type { AbRuleLayoutProps } from './types';

export function AbRuleMobile({ rule, patch, patchNumber }: AbRuleLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
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

          <AbExcludeField
            layout="mobile"
            value={rule.filter}
            onChange={(value) => patch('filter', value)}
          />
        </div>
      </div>
    </div>
  );
}
