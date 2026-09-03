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
import type { Downloader } from '#/config';

export function ConfigDownload({
  errors = [],
}: {
  errors?: ConfigFieldError[];
}) {
  const { t } = useTranslation();

  const downloader = useConfigStore((s) => s.config.downloader);
  const updateGroup = useConfigStore((s) => s.updateGroup);
  const useApiKey = useConfigStore((s) => s.useApiKey);
  const setUseApiKey = (v: boolean) =>
    useConfigStore.setState({ useApiKey: v });

  const groupErrors = getGroupErrors(errors, 'downloader');

  const items: SettingItem<Downloader>[] = [
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
    <div>
      <SettingField
        label={t('config.downloader_set.use_api_key')}
        type="switch"
        fieldKey="downloader.use_api_key"
        orientation="horizontal"
        value={useApiKey}
        onChange={setUseApiKey}
      />

      {items
        .filter((item) => isVisible(item.configKey))
        .map((item) => (
          <Fragment key={item.configKey}>
            <Separator className="my-2" />
            <SettingField
              {...item}
              fieldKey={`downloader.${item.configKey}`}
              orientation="horizontal"
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
              onChange={(v) =>
                updateGroup('downloader', { [item.configKey]: v })
              }
            />
          </Fragment>
        ))}
    </div>
  );
}
