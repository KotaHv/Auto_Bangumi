import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { AbSetting } from '@/components/ab-setting';
import { Separator } from '@/components/ui/separator';
import { useConfigStore } from '@/store/config';
import type { SettingItem } from '#/components';
import type { RssParser } from '#/config';

const LANGS = ['zh', 'en', 'jp'] as const;

export function ConfigParser() {
  const { t } = useTranslation();

  const parser = useConfigStore((s) => s.config.rss_parser);
  const updateGroup = useConfigStore((s) => s.updateGroup);

  const items: SettingItem<RssParser>[] = [
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
          <AbSetting
            {...item}
            fieldKey={`rss_parser.${item.configKey}`}
            orientation="horizontal"
            disabled={item.configKey !== 'enable' && !parser.enable}
            value={parser[item.configKey]}
            onChange={(v) => updateGroup('rss_parser', { [item.configKey]: v })}
          />
        </Fragment>
      ))}
    </div>
  );
}
