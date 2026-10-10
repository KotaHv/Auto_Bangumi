import { useTranslation } from 'react-i18next';

export function RuleMetadata({
  season,
  groupName,
}: {
  season: number;
  groupName: string | null;
}) {
  const { t } = useTranslation();

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs">
          {t('topbar.add.season_label')}
        </dt>
        <dd className="mt-1 text-sm font-medium">
          {t('topbar.add.season_value', { season })}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs">
          {t('topbar.add.group_label')}
        </dt>
        <dd className="mt-1 text-sm font-medium wrap-break-word">
          {groupName?.trim() || t('topbar.add.unknown_group')}
        </dd>
      </div>
    </dl>
  );
}
