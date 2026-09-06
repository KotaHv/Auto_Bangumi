import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigField } from '@/components/config/field';
import { Separator } from '@/components/ui/separator';
import type { ConfigFieldItem } from './types';
import type { RssParser } from '#/config';
import { useConfigDraft } from '@/pages/config/types';

const LANGS = [
  { value: 'zh', label: 'zh' },
  { value: 'en', label: 'en' },
  { value: 'jp', label: 'jp' },
];

interface ConfigParserFieldsProps {
  parser: RssParser;
  disabled: boolean;
  onChange?: (patch: Partial<RssParser>) => void;
}

export function ConfigParserFields({
  parser,
  disabled,
  onChange,
}: ConfigParserFieldsProps) {
  const { t } = useTranslation();

  const items: ConfigFieldItem<RssParser>[] = [
    {
      configKey: 'enable',
      label: t('config.parser_set.enable'),
      type: 'switch',
    },
    {
      configKey: 'language',
      label: t('config.parser_set.language'),
      type: 'select',
      prop: { items: LANGS },
    },
    {
      configKey: 'filter',
      label: t('config.parser_set.exclude'),
      type: 'dynamic-tags',
    },
  ];

  return (
    <div>
      {items.map((item, index) => (
        <Fragment key={item.configKey}>
          {index > 0 && <Separator className="my-2" />}
          <ConfigField
            {...item}
            fieldKey={`rss_parser.${item.configKey}`}
            orientation="horizontal"
            disabled={
              disabled || (item.configKey !== 'enable' && !parser.enable)
            }
            value={parser[item.configKey]}
            onChange={(v) => onChange?.({ [item.configKey]: v })}
          />
        </Fragment>
      ))}
    </div>
  );
}

export function ConfigParser() {
  const { config, updateGroup } = useConfigDraft();

  return (
    <ConfigParserFields
      parser={config.rss_parser}
      disabled={false}
      onChange={(patch) => updateGroup('rss_parser', patch)}
    />
  );
}
