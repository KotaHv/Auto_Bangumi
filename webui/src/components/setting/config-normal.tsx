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
import type { Program } from '#/config';

export function ConfigNormal({ errors = [] }: { errors?: ConfigFieldError[] }) {
  const { t } = useTranslation();

  const program = useConfigStore((s) => s.config.program);
  const log = useConfigStore((s) => s.config.log);
  const updateGroup = useConfigStore((s) => s.updateGroup);

  const groupErrors = getGroupErrors(errors, 'program');

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
    <div>
      {items.map((item, index) => (
        <Fragment key={item.configKey}>
          {index > 0 && <Separator className="my-2" />}
          <AbSetting
            label={item.label}
            type="input"
            fieldKey={`program.${item.configKey}`}
            prop={item.prop}
            description={item.description}
            orientation="horizontal"
            error={
              groupErrors[item.configKey]
                ? formatConfigError(groupErrors[item.configKey], item.label)
                : undefined
            }
            value={program[item.configKey]}
            onChange={(v) => updateGroup('program', { [item.configKey]: v })}
          />
        </Fragment>
      ))}

      <Separator className="my-2" />
      <AbSetting
        label={t('config.normal_set.debug')}
        type="switch"
        fieldKey="log.debug_enable"
        orientation="horizontal"
        value={log.debug_enable}
        onChange={(v) => updateGroup('log', { debug_enable: v })}
      />
    </div>
  );
}
