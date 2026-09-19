import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RefObject } from 'react';

interface ConfigTabSection {
  key: string;
  titleKey: string;
  icon: LucideIcon;
}

interface ConfigTabsProps {
  sections: ConfigTabSection[];
  activeTab: string;
  onSelectTab: (key: string) => void;
  tabListRef: RefObject<HTMLDivElement | null>;
  tabRefs: RefObject<Record<string, HTMLElement | null>>;
}

export function ConfigTabs({
  sections,
  activeTab,
  onSelectTab,
  tabListRef,
  tabRefs,
}: ConfigTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-muted/20 border-border/60 shrink-0 border-b px-5 py-2">
      <Tabs value={activeTab} onValueChange={onSelectTab}>
        <TabsList
          ref={tabListRef}
          variant="line"
          className="no-scrollbar relative flex h-auto! w-full items-center justify-start gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain py-0"
        >
          {sections.map((section) => (
            <TabsTrigger
              key={section.key}
              value={section.key}
              ref={(el) => {
                tabRefs.current[section.key] = el;
              }}
              className="text-muted-foreground hover:bg-muted/60 hover:text-foreground data-active:border-brand/40! data-active:bg-brand/10! data-active:text-brand h-auto flex-none rounded-lg border border-transparent px-3 py-1.5 font-sans text-[13px] font-medium after:hidden"
            >
              <section.icon className="size-4 shrink-0" aria-hidden="true" />
              {t(section.titleKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
