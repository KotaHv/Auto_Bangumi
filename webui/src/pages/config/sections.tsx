import type { ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import type { ConfigSection } from './types';

interface ConfigSectionsProps {
  sections: ConfigSection[];
  sectionRefs?: RefObject<Record<string, HTMLElement | null>>;
  renderSection: (section: ConfigSection) => ReactNode;
}

export function ConfigSections({
  sections,
  sectionRefs,
  renderSection,
}: ConfigSectionsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 sm:space-y-8">
      {sections.map((section) => (
        <section
          key={section.key}
          id={section.key}
          ref={(element) => {
            if (sectionRefs) {
              sectionRefs.current[section.key] = element;
            }
          }}
          className="min-w-0 scroll-mt-0"
        >
          <h2 className="text-brand mb-2 pl-4 font-sans text-[15px] font-semibold select-text lg:font-medium">
            {t(section.titleKey)}
          </h2>
          <Card className="border-border overflow-hidden rounded-2xl [--card-spacing:0px]">
            <CardContent className="px-4 py-2">
              {renderSection(section)}
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}
