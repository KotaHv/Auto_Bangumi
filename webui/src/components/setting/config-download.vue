<script lang="ts" setup>
import type { Downloader } from '#/config';
import type { SettingItem } from '#/components';

const { t } = useMyI18n();
const { getSettingGroup } = useConfigStore();
const { useApiKey } = storeToRefs(useConfigStore());

const downloader = getSettingGroup('downloader');

const items: SettingItem<Downloader>[] = [
  {
    configKey: 'host',
    label: () => t('config.downloader_set.host'),
    type: 'input',
    prop: {
      type: 'text',
      placeholder: '127.0.0.1:8989',
    },
  },
  {
    configKey: 'username',
    label: () => t('config.downloader_set.username'),
    type: 'input',
    prop: {
      type: 'text',
      placeholder: 'admin',
    },
  },
  {
    configKey: 'password',
    label: () => t('config.downloader_set.password'),
    type: 'input',
    prop: {
      type: 'text',
      placeholder: 'admindmin',
    },
    bottomLine: true,
  },
  {
    configKey: 'api_key',
    label: () => t('config.downloader_set.api_key'),
    type: 'input',
    prop: {
      type: 'text',
      placeholder: 'qBittorrent WebUI API Key',
    },
    bottomLine: true,
  },
  {
    configKey: 'path',
    label: () => t('config.downloader_set.path'),
    type: 'input',
    prop: {
      type: 'text',
      placeholder: '/downloads/Bangumi',
    },
  },
  {
    configKey: 'ssl',
    label: () => t('config.downloader_set.ssl'),
    type: 'switch',
  },
];

// 关闭 API Key 登录时清空 api_key，保持"开关关闭 ⇔ api_key 为空"不变式
watch(useApiKey, (value) => {
  if (!value) {
    downloader.value.api_key = null;
  }
});

function isVisible(configKey: keyof Downloader): boolean {
  if (configKey === 'api_key') return useApiKey.value;
  if (configKey === 'username' || configKey === 'password')
    return !useApiKey.value;
  return true;
}
</script>

<template>
  <ab-fold-panel :title="$t('config.downloader_set.title')">
    <div space-y-12>
      <ab-setting
        v-model:data="useApiKey"
        :label="() => t('config.downloader_set.use_api_key')"
        type="switch"
        bottom-line
      ></ab-setting>

      <ab-setting
        v-for="i in items"
        v-show="isVisible(i.configKey)"
        :key="i.configKey"
        v-bind="i"
        v-model:data="downloader[i.configKey]"
      ></ab-setting>
    </div>
  </ab-fold-panel>
</template>
