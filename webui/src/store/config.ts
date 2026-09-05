import { create } from 'zustand';
import { apiConfig } from '@/api/config';
import { message } from '@/lib/message';
import { executeApi } from '@/hooks/use-api';
import { i18n } from '@/i18n';
import { useProgramStore } from '@/store/program';
import { initConfig } from '#/config';
import type { Config } from '#/config';

const API_KEY_PATTERN = /^qbt_[A-Za-z0-9]{28}$/;

interface ConfigState {
  config: Config;
  savedConfig: Config;
  useApiKey: boolean;
  savedUseApiKey: boolean;
  /** True once the config has been fetched from the backend at least once. */
  loaded: boolean;

  getConfig: () => Promise<void>;
  setConfig: () => Promise<boolean>;
  updateGroup: <TKey extends keyof Config>(
    key: TKey,
    patch: Partial<Config[TKey]>,
  ) => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: initConfig,
  savedConfig: initConfig,
  useApiKey: false,
  savedUseApiKey: false,
  loaded: false,

  async getConfig() {
    const res = await apiConfig.getConfig();
    set({
      config: res,
      savedConfig: res,
      useApiKey: !!res.downloader.api_key,
      savedUseApiKey: !!res.downloader.api_key,
      loaded: true,
    });
  },

  async setConfig() {
    const { config, useApiKey } = get();
    let next: Config = {
      ...config,
      downloader: { ...config.downloader, api_key: null },
    };

    if (useApiKey) {
      const key = config.downloader.api_key?.trim() ?? '';
      if (!key) {
        message.warning(
          i18n.t('notify.please_enter', {
            field: i18n.t('config.downloader_set.api_key'),
          }),
        );
        return false;
      }
      if (!API_KEY_PATTERN.test(key)) {
        message.error(i18n.t('notify.api_key_format_error'));
        return false;
      }
      next = {
        ...config,
        downloader: { ...config.downloader, api_key: key },
      };
    }
    const result = await executeApi(
      apiConfig.updateConfig,
      {
        showMessage: false,
        onSuccess() {
          set({
            config: next,
            savedConfig: next,
            savedUseApiKey: useApiKey,
          });
          useProgramStore.getState().restart();
        },
      },
      next,
    );

    return result !== undefined;
  },

  updateGroup(key, patch) {
    set((state) => ({
      config: {
        ...state.config,
        [key]: { ...state.config[key], ...patch },
      },
    }));
  },
}));
