import type { ComponentType, ReactNode, RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';

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
