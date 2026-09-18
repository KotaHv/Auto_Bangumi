import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import type { RSSDraft } from '../types/rss';
import { AbSelect } from '@/components/shared/ab-select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';

const PARSER_TYPE = [
  { value: 'mikan', label: 'mikan' },
  { value: 'tmdb', label: 'tmdb' },
  { value: 'parser', label: 'parser' },
];

interface AbAddRssFormProps {
  rss: RSSDraft;
  loading: boolean;
  onChange: (patch: Partial<RSSDraft>) => void;
  onSubmit: () => void;
}

export function AbAddRssForm({
  rss,
  loading,
  onChange,
  onSubmit,
}: AbAddRssFormProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="space-y-4">
        <Field>
          <FieldLabel>{t('topbar.add.rss_link')}</FieldLabel>
          <Input
            variant="large"
            value={rss.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder={t('topbar.add.placeholder_link')}
          />
        </Field>

        <Field>
          <FieldLabel>{t('topbar.add.name')}</FieldLabel>
          <Input
            variant="large"
            value={rss.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t('topbar.add.placeholder_name')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
          <div className="sm:justify-self-start">
            <Field
              orientation="horizontal"
              className="min-h-9 w-full items-center justify-between gap-3 sm:w-fit sm:justify-start sm:gap-2"
            >
              <FieldLabel>{t('topbar.add.aggregate')}</FieldLabel>
              <Switch
                checked={rss.aggregate}
                onCheckedChange={(aggregate) => onChange({ aggregate })}
                size="lg"
              />
            </Field>
          </div>

          <div className="sm:justify-self-end">
            <Field
              orientation="horizontal"
              className="min-h-9 items-center justify-between gap-2 sm:w-fit sm:justify-start"
            >
              <FieldLabel>{t('topbar.add.parser')}</FieldLabel>
              <AbSelect
                value={rss.parser}
                items={PARSER_TYPE}
                triggerClassName="w-24 sm:w-24"
                onValueChange={(parser) => onChange({ parser })}
              />
            </Field>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button
          variant="brand"
          className="h-10 w-full sm:h-8 sm:w-auto sm:min-w-20"
          loading={loading}
          onClick={onSubmit}
        >
          {t('topbar.add.button')}
        </Button>
      </div>
    </>
  );
}
