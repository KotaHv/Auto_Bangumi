import { useTranslation } from 'react-i18next';
import { AbConfirm } from '@/components/ab-confirm';
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import type { ConfigLayoutProps } from './types';

export function ConfigMobile({
  sections,
  activeTab,
  onSelectTab,
  tabListRef,
  tabRefs,
  contentRef,
  renderSections,
  renderFooterStatus,
  renderFooterActions,
  showFooter,
  showLeaveConfirm,
  onLeaveShowChange,
  onConfirmLeave,
  showCancelConfirm,
  onCancelShowChange,
  onCancelChanges,
  confirmTitle,
  confirmMessage,
}: ConfigLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      {/* Inset section tab strip, kept outside the scrolling content. */}
      <div className="shrink-0 px-5 pt-2">
        <Tabs value={activeTab} onValueChange={onSelectTab}>
          <div className="bg-brand/5 text-foreground border-brand/15 dark:bg-brand/10 dark:border-brand/25 overflow-hidden rounded-2xl border px-4">
            <TabsList
              ref={tabListRef}
              variant="line"
              className="no-scrollbar relative flex h-11! w-full max-w-full items-stretch justify-start gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain py-0"
            >
              {sections.map((section) => (
                <TabsTrigger
                  key={section.key}
                  value={section.key}
                  ref={(el) => {
                    tabRefs.current[section.key] = el;
                  }}
                  className="data-active:text-brand h-11 items-center border-0 p-0 font-sans text-[13px] font-medium after:hidden"
                >
                  {t(section.titleKey)}
                </TabsTrigger>
              ))}

              <TabsIndicator shape="dot" />
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Scrolling content */}
      <div
        ref={contentRef}
        className={`no-scrollbar min-h-0 flex-1 scroll-pt-4 overflow-x-hidden overflow-y-auto overscroll-contain px-5 pt-4 ${showFooter ? 'pb-[calc(var(--config-action-bar-space)+16px+env(safe-area-inset-bottom))]' : 'pb-4'}`}
      >
        {renderSections()}
      </div>

      {/* Floating action bar aligned with the section cards. */}
      {showFooter && (
        <div className="bg-popover text-popover-foreground border-border absolute right-5 bottom-[calc(8px+env(safe-area-inset-bottom))] left-5 z-10 flex min-h-(--config-action-bar-space) items-center justify-between gap-3 rounded-2xl border px-4 py-2 shadow-lg">
          <div className="min-w-0">{renderFooterStatus()}</div>
          <div className="flex shrink-0 items-center gap-2">
            {renderFooterActions()}
          </div>
        </div>
      )}

      <AbConfirm
        show={showLeaveConfirm}
        onShowChange={onLeaveShowChange}
        title={confirmTitle}
        onConfirm={onConfirmLeave}
      >
        {confirmMessage}
      </AbConfirm>

      <AbConfirm
        show={showCancelConfirm}
        onShowChange={onCancelShowChange}
        title={confirmTitle}
        onConfirm={onCancelChanges}
      >
        {confirmMessage}
      </AbConfirm>
    </div>
  );
}
