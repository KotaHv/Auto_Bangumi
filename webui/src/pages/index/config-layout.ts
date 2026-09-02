import type {
  ComponentType,
  MutableRefObject,
  ReactNode,
  RefObject,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ConfigFieldError } from '@/lib/config-validation';

export interface ConfigSection {
  key: string;
  titleKey: string;
  Comp: ComponentType<{ errors?: ConfigFieldError[] }>;
  icon: LucideIcon;
}

export interface ConfigLayoutProps {
  sections: ConfigSection[];
  activeTab: string;
  onSelectTab: (key: string) => void;
  tabListRef: RefObject<HTMLDivElement | null>;
  tabRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  contentRef: RefObject<HTMLDivElement | null>;
  renderSections: () => ReactNode;
  renderFooterStatus: () => ReactNode;
  renderFooterActions: () => ReactNode;
  showFooter: boolean;
  showLeaveConfirm: boolean;
  onLeaveShowChange: (show: boolean) => void;
  onConfirmLeave: () => void;
  showCancelConfirm: boolean;
  onCancelShowChange: (show: boolean) => void;
  onCancelChanges: () => void;
  confirmTitle: string;
  confirmMessage: string;
}
