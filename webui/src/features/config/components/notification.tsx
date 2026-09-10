import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigField } from './field';
import { Separator } from '@/components/ui/separator';
import {
  formatConfigError,
  getGroupErrors,
  type ConfigFieldError,
} from '../validation';
import type { ConfigFieldItem } from './types';
import type { Notification } from '../types/config';
import { useConfigDraft } from '../config-draft';

const NOTIFICATION_TYPES = [
  { value: 'telegram', label: 'telegram' },
  { value: 'server-chan', label: 'server-chan' },
  { value: 'bark', label: 'bark' },
  { value: 'wecom', label: 'wecom' },
];

interface ConfigNotificationFieldsProps {
  notification: Notification;
  disabled: boolean;
  groupErrors?: Record<string, ConfigFieldError>;
  onChange?: (patch: Partial<Notification>) => void;
}

export function ConfigNotificationFields({
  notification,
  disabled,
  groupErrors = {},
  onChange,
}: ConfigNotificationFieldsProps) {
  const { t } = useTranslation();

  const items: ConfigFieldItem<Notification>[] = [
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
    <>
      {items.map((item, index) => (
        <Fragment key={item.configKey}>
          {index > 0 && <Separator className="my-2" />}
          <ConfigField
            {...item}
            fieldKey={`notification.${item.configKey}`}
            orientation="horizontal"
            disabled={
              disabled || (item.configKey !== 'enable' && !notification.enable)
            }
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
            onChange={(v) => onChange?.({ [item.configKey]: v })}
          />
        </Fragment>
      ))}
    </>
  );
}

export function ConfigNotification() {
  const { config, updateGroup, errors } = useConfigDraft();

  return (
    <ConfigNotificationFields
      notification={config.notification}
      disabled={false}
      groupErrors={getGroupErrors(errors, 'notification')}
      onChange={(patch) => updateGroup('notification', patch)}
    />
  );
}
