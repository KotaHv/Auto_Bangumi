import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigField } from './field';
import { Separator } from '@/components/ui/separator';
import {
  formatConfigError,
  getGroupErrors,
  type ConfigFieldError,
} from '../../editor/validation';
import type { ConfigFieldItem } from './types';
import type { Downloader } from '../../types/config';
import { useConfigDraft } from '../../editor/config-draft';

interface ConfigDownloadFieldsProps {
  downloader: Downloader;
  useApiKey: boolean;
  disabled: boolean;
  groupErrors?: Record<string, ConfigFieldError>;
  showAllFields?: boolean;
  onChange?: (patch: Partial<Downloader>) => void;
  onUseApiKeyChange?: (value: boolean) => void;
}

export function ConfigDownloadFields({
  downloader,
  useApiKey,
  disabled,
  groupErrors = {},
  showAllFields = false,
  onChange,
  onUseApiKeyChange,
}: ConfigDownloadFieldsProps) {
  const { t } = useTranslation();

  const items: ConfigFieldItem<Downloader>[] = [
    {
      configKey: 'host',
      label: t('config.downloader_set.host'),
      type: 'input',
      prop: { type: 'text', placeholder: '127.0.0.1:8989' },
    },
    {
      configKey: 'username',
      label: t('config.downloader_set.username'),
      type: 'input',
      prop: { type: 'text', placeholder: 'admin' },
    },
    {
      configKey: 'password',
      label: t('config.downloader_set.password'),
      type: 'input',
      prop: { type: 'password', placeholder: 'admindmin', autoComplete: 'off' },
    },
    {
      configKey: 'api_key',
      label: t('config.downloader_set.api_key'),
      type: 'input',
      prop: {
        type: 'password',
        placeholder: 'qBittorrent WebUI API Key',
        autoComplete: 'off',
      },
    },
    {
      configKey: 'path',
      label: t('config.downloader_set.path'),
      type: 'input',
      prop: { type: 'text', placeholder: '/downloads/Bangumi' },
    },
    {
      configKey: 'ssl',
      label: t('config.downloader_set.ssl'),
      type: 'switch',
    },
  ];

  function isVisible(configKey: keyof Downloader): boolean {
    if (configKey === 'api_key') return useApiKey;
    if (configKey === 'username' || configKey === 'password') return !useApiKey;
    return true;
  }

  return (
    <>
      <ConfigField
        label={t('config.downloader_set.use_api_key')}
        type="switch"
        fieldKey="downloader.use_api_key"
        orientation="horizontal"
        disabled={disabled}
        value={useApiKey}
        onChange={onUseApiKeyChange}
      />

      {items
        .filter((item) => showAllFields || isVisible(item.configKey))
        .map((item) => (
          <Fragment key={item.configKey}>
            <Separator className="my-2" />
            <ConfigField
              {...item}
              fieldKey={`downloader.${item.configKey}`}
              orientation="horizontal"
              disabled={disabled}
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
              value={downloader[item.configKey]}
              onChange={(v) => onChange?.({ [item.configKey]: v })}
            />
          </Fragment>
        ))}
    </>
  );
}

export function ConfigDownload() {
  const { config, updateGroup, useApiKey, setUseApiKey, errors } =
    useConfigDraft();

  return (
    <ConfigDownloadFields
      downloader={config.downloader}
      useApiKey={useApiKey}
      disabled={false}
      groupErrors={getGroupErrors(errors, 'downloader')}
      onChange={(patch) => updateGroup('downloader', patch)}
      onUseApiKeyChange={setUseApiKey}
    />
  );
}
