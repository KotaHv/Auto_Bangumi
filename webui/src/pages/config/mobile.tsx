import { AbConfirm } from '@/components/common/ab-confirm';
import { AbFloatingBar } from '@/components/common/ab-floating-bar';
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
    <div className="flex h-full min-h-0 w-full flex-col">
      <ConfigTabs
        sections={sections}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        tabListRef={tabListRef}
        tabRefs={tabRefs}
      />

      <div className="mx-5 flex h-full min-h-0 flex-col">
        <div
          ref={contentRef}
          className="no-scrollbar my-4 h-full min-h-0 flex-1 scroll-pt-4 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          {renderSections()}
        </div>

        {showFooter && (
          <AbFloatingBar position="bottom" className="justify-between gap-3">
            <div className="min-w-0">{renderFooterStatus()}</div>
            <div className="flex shrink-0 items-center gap-2">
              {renderFooterActions()}
            </div>
          </AbFloatingBar>
        )}
      </div>

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
