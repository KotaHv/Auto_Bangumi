import type { Config } from '../../types/config';

// These values are only used to keep the loading view structurally complete.
// They must never be used as the editor's saved or draft configuration.
export const configLoadingDefaults = {
  program: {
    rss_time: 900,
    rename_time: 60,
    webui_port: 7892,
  },
  downloader: {
    host: '127.0.0.1:8989',
    username: 'admin',
    password: '',
    api_key: null,
    path: '/downloads/Bangumi',
    ssl: false,
  },
  rss_parser: {
    enable: true,
    filter: [],
    language: 'zh',
  },
  bangumi_manage: {
    enable: true,
    eps_complete: true,
    rename_method: 'normal',
    group_tag: true,
    remove_bad_torrent: true,
    retain_latest_media_version: false,
  },
  log: {
    debug_enable: false,
  },
  proxy: {
    enable: false,
    type: 'http',
    host: '127.0.0.1',
    port: 7890,
    username: '',
    password: '',
  },
  notification: {
    enable: false,
    type: 'telegram',
    token: '',
    chat_id: '',
  },
  experimental_openai: {
    enable: false,
    api_key: '',
    base_url: 'https://api.openai.com/v1/',
    model: 'gpt-5.6-luna',
  },
} satisfies Config;
