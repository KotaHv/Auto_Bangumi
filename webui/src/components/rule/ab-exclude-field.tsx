import { useTranslation } from 'react-i18next';
import type { BangumiRule } from '@/types/bangumi';
import { AbDynamicTags } from '@/components/common/ab-dynamic-tags';
import { Field, FieldLabel } from '@/components/ui/field';

interface AbExcludeFieldProps {
  value: BangumiRule['filter'];
  onChange: (value: BangumiRule['filter']) => void;
  layout: 'mobile' | 'pc';
}

export function AbExcludeField({
  value,
  onChange,
  layout,
}: AbExcludeFieldProps) {
  const { t } = useTranslation();
  const label = t('homepage.rule.exclude');

  if (layout === 'mobile') {
    return (
      <div className="flex items-start gap-2">
        <FieldLabel className="w-14 shrink-0">{label}</FieldLabel>
        <div className="min-w-0 flex-1">
          <AbDynamicTags value={value} onChange={onChange} />
        </div>
      </div>
    );
  }

  return (
    <Field orientation="horizontal" className="items-start gap-3">
      <FieldLabel className="w-fit! flex-none!">{label}</FieldLabel>
      <div className="min-w-0 flex-1">
        <AbDynamicTags value={value} onChange={onChange} />
      </div>
    </Field>
  );
}
