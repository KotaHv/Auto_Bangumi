export interface Config {
  program: {
    rss_time: number;
    rename_time: number;
    webui_port: number;
  };
  downloader: {
    host: string;
    username: string;
    password: string;
    api_key: string | null;
    path: string;
    ssl: boolean;
  };
  rss_parser: {
    enable: boolean;
    filter: Array<string>;
    language: 'zh' | 'en' | 'jp';
  };
  bangumi_manage: {
    enable: boolean;
    eps_complete: boolean;
    rename_method: 'normal' | 'pn' | 'advance' | 'none';
    group_tag: boolean;
    remove_bad_torrent: boolean;
    retain_latest_media_version: boolean;
  };
  log: {
    debug_enable: boolean;
  };
  proxy: {
    enable: boolean;
    type: 'http' | 'https' | 'socks5';
    host: string;
    port: number;
    username: string;
    password: string;
  };
  notification: {
    enable: boolean;
    type: 'telegram' | 'server-chan' | 'bark' | 'wecom';
    token: string;
    chat_id: string;
  };
  experimental_openai: {
    enable: boolean;
    api_key: string;
    base_url: string;
    model: string;
  };
}

export const initConfig: Config = {
  program: {
    rss_time: 0,
    rename_time: 0,
    webui_port: 0,
  },
  downloader: {
    host: '',
    username: '',
    password: '',
    api_key: null,
    path: '',
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
    host: '',
    port: 0,
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
};

type getItem<T extends keyof Config> = Pick<Config, T>[T];

export type Program = getItem<'program'>;
export type Downloader = getItem<'downloader'>;
export type RssParser = getItem<'rss_parser'>;
export type BangumiManage = getItem<'bangumi_manage'>;
export type Log = getItem<'log'>;
export type Proxy = getItem<'proxy'>;
export type Notification = getItem<'notification'>;
export type ExperimentalOpenAI = getItem<'experimental_openai'>;
