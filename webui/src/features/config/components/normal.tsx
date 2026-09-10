import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigField } from './field';
import { Separator } from '@/components/ui/separator';
import {
  formatConfigError,
  getGroupErrors,
  type ConfigFieldError,
} from '../validation';
import type { Log, Program } from '../types/config';
import { useConfigDraft } from '../config-draft';

interface ConfigNormalFieldsProps {
  program: Program;
  log: Log;
  disabled: boolean;
  groupErrors?: Record<string, ConfigFieldError>;
  onProgramChange?: (patch: Partial<Program>) => void;
  onLogChange?: (patch: Partial<Log>) => void;
}

export function ConfigNormalFields({
  program,
  log,
  disabled,
  groupErrors = {},
  onProgramChange,
  onLogChange,
}: ConfigNormalFieldsProps) {
  const { t } = useTranslation();

  const items: {
    configKey: keyof Program;
    label: string;
    description?: string;
    prop?: { type: 'number'; min?: number; max?: number; placeholder?: string };
  }[] = [
    {
      configKey: 'rss_time',
      label: t('config.normal_set.rss_interval'),
      prop: { type: 'number', min: 1, placeholder: '900' },
    },
    {
      configKey: 'rename_time',
      label: t('config.normal_set.rename_interval'),
      prop: { type: 'number', min: 1, placeholder: '60' },
    },
    {
      configKey: 'webui_port',
      label: t('config.normal_set.web_port'),
      prop: { type: 'number', min: 1, max: 65535, placeholder: '7892' },
    },
  ];

  return (
    <>
      {items.map((item, index) => (
        <Fragment key={item.configKey}>
          {index > 0 && <Separator className="my-2" />}
          <ConfigField
            label={item.label}
            type="input"
            fieldKey={`program.${item.configKey}`}
            prop={item.prop}
            description={item.description}
            orientation="horizontal"
            disabled={disabled}
            error={
              groupErrors[item.configKey]
                ? formatConfigError(groupErrors[item.configKey], item.label)
                : undefined
            }
            value={program[item.configKey]}
            onChange={(v) => onProgramChange?.({ [item.configKey]: v })}
          />
        </Fragment>
      ))}

      <Separator className="my-2" />
      <ConfigField
        label={t('config.normal_set.debug')}
        type="switch"
        fieldKey="log.debug_enable"
        orientation="horizontal"
        disabled={disabled}
        value={log.debug_enable}
        onChange={(v) => onLogChange?.({ debug_enable: v })}
      />
    </>
  );
}

export function ConfigNormal() {
  const { config, updateGroup, errors } = useConfigDraft();

  return (
    <ConfigNormalFields
      program={config.program}
      log={config.log}
      disabled={false}
      groupErrors={getGroupErrors(errors, 'program')}
      onProgramChange={(patch) => updateGroup('program', patch)}
      onLogChange={(patch) => updateGroup('log', patch)}
    />
  );
}
