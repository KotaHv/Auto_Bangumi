import { type Config, initConfig } from '#/config';

/**
 * qBittorrent WebUI API Key (v5.2.0+): 32 characters long, 'qbt_' followed by
 * 28 random alphanumeric characters (160 bits of entropy).
 */
const API_KEY_PATTERN = /^qbt_[A-Za-z0-9]{28}$/;

export const useConfigStore = defineStore('config', () => {
  const config = ref<Config>(initConfig);

  /** UI 态：是否使用 API Key 登录。不入库，由 api_key 是否非空推导。 */
  const useApiKey = ref(false);

  const { t } = useMyI18n();
  const message = useMessage();

  async function getConfig() {
    const res = await apiConfig.getConfig();
    config.value = res;
    useApiKey.value = !!res.downloader.api_key;
  }

  const { execute: set } = useApi(apiConfig.updateConfig, {
    showMessage: true,
    onSuccess() {
      // 保存 config 后重启，以应用最新配置
      const { restart } = useProgramStore();
      restart();
    },
  });

  const setConfig = () => {
    if (!useApiKey.value) {
      // 未开启 API Key 登录时提交 null，使用用户名/密码登录
      config.value.downloader.api_key = null;
    } else {
      const key = config.value.downloader.api_key?.trim() ?? '';
      if (!key) {
        message.warning(
          t('notify.please_enter', [t('config.downloader_set.api_key')])
        );
        return;
      }
      if (!API_KEY_PATTERN.test(key)) {
        message.error(t('notify.api_key_format_error'));
        return;
      }
      config.value.downloader.api_key = key;
    }
    set(config.value);
  };

  function getSettingGroup<Tkey extends keyof Config>(key: Tkey) {
    return computed<Config[Tkey]>({
      get() {
        return config.value[key];
      },
      set(newVal) {
        config.value[key] = newVal;
      },
    });
  }

  return {
    config,
    useApiKey,
    getConfig,
    setConfig,
    getSettingGroup,
  };
});
