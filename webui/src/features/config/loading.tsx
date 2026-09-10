import type { ReactNode } from 'react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/spinner';
import { ConfigDownloadFields } from './components/download';
import { ConfigManageFields } from './components/manage';
import { ConfigNormalFields } from './components/normal';
import { ConfigNotificationFields } from './components/notification';
import { ConfigOpenAIFields } from './components/openai';
import { ConfigParserFields } from './components/parser';
import { ConfigProxyFields } from './components/proxy';
import { ConfigPageLayout } from './layout';
import { configLoadingDefaults } from './loading-defaults';
import { ConfigSections } from './sections';
import type { ConfigSection } from './types/page';

function assertNever(value: never): never {
  throw new Error(`Unhandled config loading section: ${value}`);
}

function renderLoadingSection(section: ConfigSection): ReactNode {
  const defaults = configLoadingDefaults;

  switch (section.key) {
    case 'normal':
      return (
        <ConfigNormalFields
          program={defaults.program}
          log={defaults.log}
          disabled
        />
      );
    case 'parser':
      return <ConfigParserFields parser={defaults.rss_parser} disabled />;
    case 'download':
      return (
        <ConfigDownloadFields
          downloader={defaults.downloader}
          useApiKey={false}
          disabled
          showAllFields
        />
      );
    case 'manage':
      return <ConfigManageFields manage={defaults.bangumi_manage} disabled />;
    case 'notification':
      return (
        <ConfigNotificationFields
          notification={defaults.notification}
          disabled
        />
      );
    case 'proxy':
      return <ConfigProxyFields proxy={defaults.proxy} disabled />;
    case 'openai':
      return (
        <ConfigOpenAIFields openAI={defaults.experimental_openai} disabled />
      );
    default:
      return assertNever(section.key);
  }
}

export function ConfigLoadingView({ sections }: { sections: ConfigSection[] }) {
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLElement | null>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  return (
    <div className="relative h-full min-h-0 w-full" aria-busy="true">
      <div inert aria-hidden="true" className="h-full min-h-0">
        <ConfigPageLayout
          sections={sections}
          activeTab={sections[0]?.key ?? ''}
          onSelectTab={() => undefined}
          tabListRef={tabListRef}
          tabRefs={tabRefs}
          contentRef={contentRef}
          content={
            <ConfigSections
              sections={sections}
              renderSection={renderLoadingSection}
            />
          }
        />
      </div>
      <div
        role="status"
        aria-live="polite"
        aria-label={t('config.loading')}
        className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]"
      >
        <Spinner className="text-brand size-5" />
      </div>
    </div>
  );
}
