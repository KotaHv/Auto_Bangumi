import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigField } from '@/components/config/field';
import { Separator } from '@/components/ui/separator';
import {
  formatConfigError,
  getGroupErrors,
  type ConfigFieldError,
} from '@/lib/config-validation';
import type { AbSelectOption } from '@/components/common/ab-select';
import type { ConfigFieldItem } from './types';
import type { Proxy } from '#/config';
import { useConfigDraft } from '@/pages/config/types';

const PROXY_TYPES: AbSelectOption[] = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks5', label: 'SOCKS5' },
];

interface ConfigProxyFieldsProps {
  proxy: Proxy;
  disabled: boolean;
  groupErrors?: Record<string, ConfigFieldError>;
  onChange?: (patch: Partial<Proxy>) => void;
}

export function ConfigProxyFields({
  proxy,
  disabled,
  groupErrors = {},
  onChange,
}: ConfigProxyFieldsProps) {
  const { t } = useTranslation();

  const items: ConfigFieldItem<Proxy>[] = [
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
          <ConfigField
            {...item}
            fieldKey={`proxy.${item.configKey}`}
            orientation="horizontal"
            disabled={
              disabled || (item.configKey !== 'enable' && !proxy.enable)
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
            value={proxy[item.configKey]}
            onChange={(v) => onChange?.({ [item.configKey]: v })}
          />
        </Fragment>
      ))}
    </div>
  );
}

export function ConfigProxy() {
  const { config, updateGroup, errors } = useConfigDraft();

  return (
    <ConfigProxyFields
      proxy={config.proxy}
      disabled={false}
      groupErrors={getGroupErrors(errors, 'proxy')}
      onChange={(patch) => updateGroup('proxy', patch)}
    />
  );
}
