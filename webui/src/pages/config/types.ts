import { createContext, useContext } from 'react';
import type { ComponentType, ReactNode, RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ConfigFieldError } from '@/lib/config-validation';
import type { Config } from '#/config';

export interface ConfigDraftContextValue {
  config: Config;
  updateGroup: <TKey extends keyof Config>(
    key: TKey,
    patch: Partial<Config[TKey]>,
  ) => void;
  useApiKey: boolean;
  setUseApiKey: (value: boolean) => void;
  errors: ConfigFieldError[];
}

export const ConfigDraftContext = createContext<ConfigDraftContextValue | null>(
  null,
);

export function useConfigDraft() {
  const value = useContext(ConfigDraftContext);
  if (!value) throw new Error('Config fields must be rendered in ConfigPage');
  return value;
}

export type ConfigSectionKey =
  | 'normal'
  | 'parser'
  | 'download'
  | 'manage'
  | 'notification'
  | 'proxy'
  | 'openai';

export interface ConfigSection {
  key: ConfigSectionKey;
  titleKey: string;
  Comp: ComponentType;
  icon: LucideIcon;
}

export interface ConfigLayoutProps {
  sections: ConfigSection[];
  activeTab: string;
  onSelectTab: (key: string) => void;
  tabListRef: RefObject<HTMLDivElement | null>;
  tabRefs: RefObject<Record<string, HTMLElement | null>>;
  contentRef: RefObject<HTMLDivElement | null>;
  content: ReactNode;
  footer?: {
    status: ReactNode;
    actions: ReactNode;
  };
}
