import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingField } from '@/components/config/field';
import { Separator } from '@/components/ui/separator';
import { useConfigStore } from '@/store/config';
import type { SettingItem } from '#/components';
import type { BangumiManage } from '#/config';

const RENAME_METHODS = [
  { value: 'normal', label: 'normal' },
  { value: 'pn', label: 'pn' },
  { value: 'advance', label: 'advance' },
  { value: 'none', label: 'none' },
];

export function ConfigManage() {
  const { t } = useTranslation();

  const manage = useConfigStore((s) => s.config.bangumi_manage);
  const updateGroup = useConfigStore((s) => s.updateGroup);

  const items: SettingItem<BangumiManage>[] = [
    {
      configKey: 'enable',
      label: t('config.manage_set.enable'),
      type: 'switch',
    },
    {
      configKey: 'rename_method',
      label: t('config.manage_set.method'),
      type: 'select',
      prop: { items: RENAME_METHODS },
    },
    {
      configKey: 'eps_complete',
      label: t('config.manage_set.eps'),
      type: 'switch',
    },
    {
      configKey: 'group_tag',
      label: t('config.manage_set.group_tag'),
      type: 'switch',
    },
    {
      configKey: 'remove_bad_torrent',
      label: t('config.manage_set.delete_bad_torrent'),
      type: 'switch',
    },
    {
      configKey: 'retain_latest_media_version',
      label: t('config.manage_set.retain_latest_media_version'),
      type: 'switch',
    },
  ];

  return (
    <div>
      {items.map((item, index) => (
        <Fragment key={item.configKey}>
          {index > 0 && <Separator className="my-2" />}
          <SettingField
            {...item}
            fieldKey={`bangumi_manage.${item.configKey}`}
            orientation="horizontal"
            disabled={item.configKey !== 'enable' && !manage.enable}
            value={manage[item.configKey]}
            onChange={(v) =>
              updateGroup('bangumi_manage', { [item.configKey]: v })
            }
          />
        </Fragment>
      ))}
    </div>
  );
}
