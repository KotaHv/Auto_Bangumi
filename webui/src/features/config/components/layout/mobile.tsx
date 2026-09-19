import { AbFloatingBar } from '@/components/shared/ab-floating-bar';
import { ConfigTabs } from '../navigation/tabs';
import type { ConfigLayoutProps } from '../../types/page';

export function ConfigMobile({
  sections,
  activeTab,
  onSelectTab,
  tabListRef,
  tabRefs,
  contentRef,
  content,
  footer,
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
          {content}
        </div>

        {footer && (
          <AbFloatingBar position="bottom" className="justify-between gap-3">
            <div className="min-w-0">{footer.status}</div>
            <div className="flex shrink-0 items-center gap-2">
              {footer.actions}
            </div>
          </AbFloatingBar>
        )}
      </div>
    </div>
  );
}
