import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface ConfigNavSection {
  key: string;
  title: string;
  icon: LucideIcon;
}

interface ConfigNavProps {
  sections: ConfigNavSection[];
  title: string;
  activeTab: string;
  onSelect: (key: string) => void;
}

export function ConfigNav({
  sections,
  title,
  activeTab,
  onSelect,
}: ConfigNavProps) {
  return (
    <nav
      aria-label="Config sections"
      className="flex h-full w-52 shrink-0 flex-col gap-2 px-4 py-5"
    >
      <div className="text-muted-foreground/60 px-3 pb-1 text-[11px] font-medium tracking-[0.16em] uppercase">
        {title}
      </div>
      {sections.map((section) => {
        const active = activeTab === section.key;
        return (
          <Button
            key={section.key}
            type="button"
            variant="ghost"
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(section.key)}
            className={cn(
              'h-9 justify-start gap-2.5 rounded-lg border border-transparent px-3 text-left font-sans text-[13px] font-medium',
              active
                ? 'border-brand/40 bg-brand/10 text-brand dark:border-[#8b7cf6]/40 dark:bg-[#8b7cf6]/10 dark:text-[#cfc7ff]'
                : 'text-muted-foreground/75 hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <section.icon className="size-4 shrink-0" aria-hidden="true" />
            {section.title}
          </Button>
        );
      })}
    </nav>
  );
}
