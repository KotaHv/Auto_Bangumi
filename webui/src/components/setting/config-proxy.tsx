import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { AbSetting } from '@/components/ab-setting';
import { Separator } from '@/components/ui/separator';
import { useConfigStore } from '@/store/config';
import {
  formatConfigError,
  getGroupErrors,
  type ConfigFieldError,
} from '@/lib/config-validation';
import type { SettingItem, SelectItem } from '#/components';
import type { Proxy } from '#/config';

const PROXY_TYPES: SelectItem[] = [
  { id: 0, value: 'http', label: 'HTTP' },
  { id: 1, value: 'https', label: 'HTTPS' },
  { id: 2, value: 'socks5', label: 'SOCKS5' },
];

export function ConfigProxy({ errors = [] }: { errors?: ConfigFieldError[] }) {
  const { t } = useTranslation();

  const proxy = useConfigStore((s) => s.config.proxy);
  const updateGroup = useConfigStore((s) => s.updateGroup);

  const groupErrors = getGroupErrors(errors, 'proxy');

  const items: SettingItem<Proxy>[] = [
    {
      configKey: 'enable',
      label: t('config.proxy_set.enable'),
      type: 'switch',
    },
    {
      configKey: 'type',
      label: t('config.proxy_set.type'),
      type: 'select',
      prop: { items: PROXY_TYPES },
    },
    {
      configKey: 'host',
      label: t('config.proxy_set.host'),
      type: 'input',
      prop: { type: 'text', placeholder: '127.0.0.1' },
    },
    {
      configKey: 'port',
      label: t('config.proxy_set.port'),
      type: 'input',
      prop: { type: 'number', min: 1, max: 65535, placeholder: '7890' },
    },
    {
      configKey: 'username',
      label: t('config.proxy_set.username'),
      type: 'input',
      prop: { type: 'text', placeholder: 'username', autoComplete: 'off' },
    },
    {
      configKey: 'password',
      label: t('config.proxy_set.password'),
      type: 'input',
      prop: { type: 'password', placeholder: 'password', autoComplete: 'off' },
    },
  ];

  return (
    <div>
      {items.map((item, index) => (
        <Fragment key={item.configKey}>
          {index > 0 && <Separator className="my-2" />}
          <AbSetting
            {...item}
            fieldKey={`proxy.${item.configKey}`}
            orientation="horizontal"
            disabled={item.configKey !== 'enable' && !proxy.enable}
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
            value={proxy[item.configKey]}
            onChange={(v) => updateGroup('proxy', { [item.configKey]: v })}
          />
        </Fragment>
      ))}
    </div>
  );
}
