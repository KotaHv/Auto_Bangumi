import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { ConfigField } from '@/components/config/field';
import { Separator } from '@/components/ui/separator';
import { useConfigStore } from '@/store/config';
import {
  formatConfigError,
  getGroupErrors,
  type ConfigFieldError,
} from '@/lib/config-validation';
import type { ConfigFieldItem } from './types';
import type { ExperimentalOpenAI } from '#/config';

export function ConfigOpenAI({ errors = [] }: { errors?: ConfigFieldError[] }) {
  const { t } = useTranslation();

  const openAI = useConfigStore((s) => s.config.experimental_openai);
  const updateGroup = useConfigStore((s) => s.updateGroup);

  const groupErrors = getGroupErrors(errors, 'experimental_openai');

  const openAIItems: ConfigFieldItem<ExperimentalOpenAI>[] = [
    {
      configKey: 'enable',
      label: t('config.experimental_openai_set.enable'),
      type: 'switch',
    },
    {
      configKey: 'api_key',
      label: t('config.experimental_openai_set.api_key'),
      type: 'input',
      prop: {
        type: 'password',
        placeholder: 'e.g: sk-3Bl****w2E9kW',
        autoComplete: 'off',
      },
    },
    {
      configKey: 'base_url',
      label: t('config.experimental_openai_set.base_url'),
      type: 'input',
      prop: { type: 'url', placeholder: 'OpenAI API Base URL' },
    },
    {
      configKey: 'model',
      label: t('config.experimental_openai_set.model'),
      type: 'input',
      prop: { placeholder: 'gpt-5.6-luna' },
    },
  ];

  return (
    <div>
      <Alert className="border-amber-200/70 bg-amber-100 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
        <AlertTitle>{t('config.experimental_openai_set.warning')}</AlertTitle>
      </Alert>

      {openAIItems.map((item) => (
        <Fragment key={item.configKey}>
          <Separator className="my-2" />
          <ConfigField
            {...item}
            fieldKey={`experimental_openai.${item.configKey}`}
            orientation="horizontal"
            disabled={item.configKey !== 'enable' && !openAI.enable}
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
            value={openAI[item.configKey]}
            onChange={(v) =>
              updateGroup('experimental_openai', { [item.configKey]: v })
            }
          />
        </Fragment>
      ))}
    </div>
  );
}
