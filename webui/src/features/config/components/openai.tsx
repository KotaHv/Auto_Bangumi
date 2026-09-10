import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { ConfigField } from './field';
import { Separator } from '@/components/ui/separator';
import {
  formatConfigError,
  getGroupErrors,
  type ConfigFieldError,
} from '../validation';
import type { ConfigFieldItem } from './types';
import type { ExperimentalOpenAI } from '../types/config';
import { useConfigDraft } from '../config-draft';

interface ConfigOpenAIFieldsProps {
  openAI: ExperimentalOpenAI;
  disabled: boolean;
  groupErrors?: Record<string, ConfigFieldError>;
  onChange?: (patch: Partial<ExperimentalOpenAI>) => void;
}

export function ConfigOpenAIFields({
  openAI,
  disabled,
  groupErrors = {},
  onChange,
}: ConfigOpenAIFieldsProps) {
  const { t } = useTranslation();

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
    <>
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
            disabled={
              disabled || (item.configKey !== 'enable' && !openAI.enable)
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
            value={openAI[item.configKey]}
            onChange={(v) => onChange?.({ [item.configKey]: v })}
          />
        </Fragment>
      ))}
    </>
  );
}

export function ConfigOpenAI() {
  const { config, updateGroup, errors } = useConfigDraft();

  return (
    <ConfigOpenAIFields
      openAI={config.experimental_openai}
      disabled={false}
      groupErrors={getGroupErrors(errors, 'experimental_openai')}
      onChange={(patch) => updateGroup('experimental_openai', patch)}
    />
  );
}
