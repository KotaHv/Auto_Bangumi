<script lang="ts" setup>
import { Caution } from '@icon-park/vue-next';
import type { SettingItem } from '#/components';
import type { ExperimentalOpenAI } from '#/config';

const { t } = useMyI18n();
const { getSettingGroup } = useConfigStore();

const openAI = getSettingGroup('experimental_openai');

const openAIItems: SettingItem<ExperimentalOpenAI>[] = [
  {
    configKey: 'enable',
    label: () => t('config.experimental_openai_set.enable'),
    type: 'switch',
  },
  {
    configKey: 'api_key',
    label: () => t('config.experimental_openai_set.api_key'),
    type: 'input',
    prop: {
      type: 'password',
      placeholder: 'e.g: sk-3Bl****w2E9kW',
    },
  },
  {
    configKey: 'base_url',
    label: () => t('config.experimental_openai_set.base_url'),
    type: 'input',
    prop: {
      type: 'url',
      placeholder: 'OpenAI API Base URL',
    },
  },
  {
    configKey: 'model',
    label: () => t('config.experimental_openai_set.model'),
    type: 'input',
    prop: {
      placeholder: 'gpt-4o-mini',
    },
  },
];
</script>

<template>
  <ab-fold-panel :title="$t('config.experimental_openai_set.title')">
    <div fx-cer gap-2 mb-4 p-2 bg-amber-300 rounded-4>
      <Caution />
      <span>{{ $t('config.experimental_openai_set.warning') }}</span>
    </div>

    <div space-y-12>
      <ab-setting
        v-for="i in openAIItems"
        :key="i.configKey"
        v-bind="i"
        v-model:data="openAI[i.configKey]"
      ></ab-setting>
    </div>
  </ab-fold-panel>
</template>
