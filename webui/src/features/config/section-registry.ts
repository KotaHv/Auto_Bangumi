import {
  Bell,
  Download,
  FileSearch,
  ListChecks,
  Network,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { ConfigDownload } from './components/sections/download';
import { ConfigManage } from './components/sections/manage';
import { ConfigNormal } from './components/sections/normal';
import { ConfigNotification } from './components/sections/notification';
import { ConfigOpenAI } from './components/sections/openai';
import { ConfigParser } from './components/sections/parser';
import { ConfigProxy } from './components/sections/proxy';
import type { ConfigSection } from './types/page';

export const CONFIG_SECTIONS: ConfigSection[] = [
  {
    key: 'normal',
    titleKey: 'config.normal_set.title',
    Comp: ConfigNormal,
    icon: Settings2,
  },
  {
    key: 'parser',
    titleKey: 'config.parser_set.title',
    Comp: ConfigParser,
    icon: FileSearch,
  },
  {
    key: 'download',
    titleKey: 'config.downloader_set.title',
    Comp: ConfigDownload,
    icon: Download,
  },
  {
    key: 'manage',
    titleKey: 'config.manage_set.title',
    Comp: ConfigManage,
    icon: ListChecks,
  },
  {
    key: 'notification',
    titleKey: 'config.notification_set.title',
    Comp: ConfigNotification,
    icon: Bell,
  },
  {
    key: 'proxy',
    titleKey: 'config.proxy_set.title',
    Comp: ConfigProxy,
    icon: Network,
  },
  {
    key: 'openai',
    titleKey: 'config.experimental_openai_set.title',
    Comp: ConfigOpenAI,
    icon: Sparkles,
  },
];

export const CONFIG_GROUP_SECTION_KEYS = new Map<string, string>([
  ['downloader', 'download'],
  ['rss_parser', 'parser'],
  ['bangumi_manage', 'manage'],
  ['experimental_openai', 'openai'],
  ['program', 'normal'],
  ['log', 'normal'],
]);
