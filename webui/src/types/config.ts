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

type getItem<T extends keyof Config> = Pick<Config, T>[T];

export type Program = getItem<'program'>;
export type Downloader = getItem<'downloader'>;
export type RssParser = getItem<'rss_parser'>;
export type BangumiManage = getItem<'bangumi_manage'>;
export type Log = getItem<'log'>;
export type Proxy = getItem<'proxy'>;
export type Notification = getItem<'notification'>;
export type ExperimentalOpenAI = getItem<'experimental_openai'>;
