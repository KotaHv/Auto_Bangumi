import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingField } from '@/components/config/field';
import { Separator } from '@/components/ui/separator';
import { useConfigStore } from '@/store/config';
import {
  formatConfigError,
  getGroupErrors,
  type ConfigFieldError,
} from '@/lib/config-validation';
import type { SettingItem } from '#/components';
import type { Notification } from '#/config';

const NOTIFICATION_TYPES = [
  { value: 'telegram', label: 'telegram' },
  { value: 'server-chan', label: 'server-chan' },
  { value: 'bark', label: 'bark' },
  { value: 'wecom', label: 'wecom' },
];

export function ConfigNotification({
  errors = [],
}: {
  errors?: ConfigFieldError[];
}) {
  const { t } = useTranslation();

  const notification = useConfigStore((s) => s.config.notification);
  const updateGroup = useConfigStore((s) => s.updateGroup);

  const groupErrors = getGroupErrors(errors, 'notification');

  const items: SettingItem<Notification>[] = [
    {
      configKey: 'enable',
      label: t('config.notification_set.enable'),
      type: 'switch',
    },
    {
      configKey: 'type',
      label: t('config.notification_set.type'),
      type: 'select',
      prop: { items: NOTIFICATION_TYPES },
    },
    {
      configKey: 'token',
      label: t('config.notification_set.token'),
      type: 'input',
      prop: { type: 'password', placeholder: 'token', autoComplete: 'off' },
    },
    {
      configKey: 'chat_id',
      label: t('config.notification_set.chat_id'),
      type: 'input',
      prop: { type: 'text', placeholder: 'chat id' },
    },
  ];

  return (
    <div>
      {items.map((item, index) => (
        <Fragment key={item.configKey}>
          {index > 0 && <Separator className="my-2" />}
          <SettingField
            {...item}
            fieldKey={`notification.${item.configKey}`}
            orientation="horizontal"
            disabled={item.configKey !== 'enable' && !notification.enable}
            error={
              groupErrors[item.configKey]
                ? formatConfigError(
                    groupErrors[item.configKey],
                    typeof item.label === 'function'
                      ? item.label()
                      : item.label,
                  )
                : undefined
            }
            value={notification[item.configKey]}
            onChange={(v) =>
              updateGroup('notification', { [item.configKey]: v })
            }
          />
        </Fragment>
      ))}
    </div>
  );
}
