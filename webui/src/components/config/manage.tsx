import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigField } from '@/components/config/field';
import { Separator } from '@/components/ui/separator';
import type { ConfigFieldItem } from './types';
import type { BangumiManage } from '@/types/config';
import { useConfigDraft } from '@/contexts/config-draft';

const RENAME_METHODS = [
  { value: 'normal', label: 'normal' },
  { value: 'pn', label: 'pn' },
  { value: 'advance', label: 'advance' },
  { value: 'none', label: 'none' },
];

interface ConfigManageFieldsProps {
  manage: BangumiManage;
  disabled: boolean;
  onChange?: (patch: Partial<BangumiManage>) => void;
}

export function ConfigManageFields({
  manage,
  disabled,
  onChange,
}: ConfigManageFieldsProps) {
  const { t } = useTranslation();

  const items: ConfigFieldItem<BangumiManage>[] = [
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
          <ConfigField
            {...item}
            fieldKey={`bangumi_manage.${item.configKey}`}
            orientation="horizontal"
            disabled={
              disabled || (item.configKey !== 'enable' && !manage.enable)
            }
            value={manage[item.configKey]}
            onChange={(v) => onChange?.({ [item.configKey]: v })}
          />
        </Fragment>
      ))}
    </div>
  );
}

export function ConfigManage() {
  const { config, updateGroup } = useConfigDraft();

  return (
    <ConfigManageFields
      manage={config.bangumi_manage}
      disabled={false}
      onChange={(patch) => updateGroup('bangumi_manage', patch)}
    />
  );
}
