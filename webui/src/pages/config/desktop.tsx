import { ConfigNav } from '@/components/config/nav';
import { useTranslation } from 'react-i18next';
import type { ConfigLayoutProps } from './types';

export function ConfigDesktop({
  sections,
  activeTab,
  onSelectTab,
  contentRef,
  content,
  footer,
}: ConfigLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex min-h-0 w-full max-w-4xl flex-col">
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Left vertical group navigation */}
          <div className="bg-muted/20 border-border/60 hidden shrink-0 border-r lg:block">
            <ConfigNav
              sections={sections.map((section) => ({
                key: section.key,
                title: t(section.titleKey),
                icon: section.icon,
              }))}
              title={t('config.navigation_title')}
              activeTab={activeTab}
              onSelect={onSelectTab}
            />
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              ref={contentRef}
              className="no-scrollbar min-h-0 flex-1 scroll-pt-5 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-5"
            >
              {content}
            </div>

            {footer && (
              <div className="bg-muted/30 border-border/70 flex shrink-0 items-center justify-between gap-4 border-t px-6 py-3">
                {footer.status}
                <div className="flex shrink-0 items-center gap-2">
                  {footer.actions}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
