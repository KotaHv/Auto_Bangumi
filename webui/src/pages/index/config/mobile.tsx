import { AbConfirm } from '@/components/ab-confirm';
import { ConfigTabs } from '@/components/config/tabs';
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
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <ConfigTabs
        sections={sections}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        tabListRef={tabListRef}
        tabRefs={tabRefs}
      />

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
