import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker, useSearchParams } from 'react-router';
import {
  Bell,
  Download,
  FileSearch,
  ListChecks,
  Network,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { AbButton } from '@/components/basic/ab-button';
import { message } from '@/components/message';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfigDownload } from '@/components/config/download';
import { ConfigManage } from '@/components/config/manage';
import { ConfigNormal } from '@/components/config/normal';
import { ConfigNotification } from '@/components/config/notification';
import { ConfigOpenAI } from '@/components/config/openai';
import { ConfigParser } from '@/components/config/parser';
import { ConfigProxy } from '@/components/config/proxy';
import { useConfigStore } from '@/store/config';
import { getConfigErrors } from '@/lib/config-validation';
import { useIsPc } from '@/hooks/use-is-pc';
import { ConfigMobile } from './mobile';
import { ConfigPc } from './pc';
import type { ConfigSection } from './types';
import type { Config } from '#/config';

function hasConfigChanges(
  config: Config,
  savedConfig: Config,
  useApiKey: boolean,
  savedUseApiKey: boolean,
) {
  if (useApiKey !== savedUseApiKey) return true;

  return (Object.keys(config) as Array<keyof Config>).some(
    (key) => !Object.is(config[key], savedConfig[key]),
  );
}

// The tab strip is outside the scrolling content, so section positions only
// need to account for the scroll container's own padding.
const useTabOffset = () => {
  const isPc = useIsPc();
  const ref = useRef(0);

  return { isPc, tabOffsetRef: ref };
};

function ConfigSkeletonRow() {
  return (
    <div className="flex min-h-8 items-center justify-between gap-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-full sm:w-64" />
    </div>
  );
}

function ConfigSectionSkeleton() {
  return (
    <div className="space-y-2 py-1">
      <ConfigSkeletonRow />
      <ConfigSkeletonRow />
      <ConfigSkeletonRow />
    </div>
  );
}

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    key: 'normal',
    titleKey: 'config.normal_set.title',
    Comp: ConfigNormal,
    icon: Settings2,
  },
  {
    key: 'parser',
    titleKey: 'config.parser_set.title',
    Comp: ConfigParser,
    icon: FileSearch,
  },
  {
    key: 'download',
    titleKey: 'config.downloader_set.title',
    Comp: ConfigDownload,
    icon: Download,
  },
  {
    key: 'manage',
    titleKey: 'config.manage_set.title',
    Comp: ConfigManage,
    icon: ListChecks,
  },
  {
    key: 'notification',
    titleKey: 'config.notification_set.title',
    Comp: ConfigNotification,
    icon: Bell,
  },
  {
    key: 'proxy',
    titleKey: 'config.proxy_set.title',
    Comp: ConfigProxy,
    icon: Network,
  },
  {
    key: 'openai',
    titleKey: 'config.experimental_openai_set.title',
    Comp: ConfigOpenAI,
    icon: Sparkles,
  },
];

export default function ConfigPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const getConfig = useConfigStore((s) => s.getConfig);
  const setConfig = useConfigStore((s) => s.setConfig);
  const config = useConfigStore((s) => s.config);
  const savedConfig = useConfigStore((s) => s.savedConfig);
  const useApiKey = useConfigStore((s) => s.useApiKey);
  const savedUseApiKey = useConfigStore((s) => s.savedUseApiKey);
  const loaded = useConfigStore((s) => s.loaded);
  const configChanged = hasConfigChanges(
    config,
    savedConfig,
    useApiKey,
    savedUseApiKey,
  );

  const errors = useMemo(
    () => getConfigErrors(config, useApiKey),
    [config, useApiKey],
  );
  const hasErrors = errors.length > 0;

  const [activeTab, setActiveTabState] = useState(() => {
    const param = searchParams.get('tab');
    return CONFIG_SECTIONS.some((s) => s.key === param)
      ? (param as string)
      : 'normal';
  });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { isPc, tabOffsetRef } = useTabOffset();
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLElement | null>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const activeTabRef = useRef(activeTab);
  const programmaticRef = useRef(false);
  const finishProgrammaticRef = useRef<(() => void) | null>(null);
  const tabInlineRef = useRef<ScrollLogicalPosition>('nearest');
  const initialUrlSyncRef = useRef(false);

  useEffect(() => {
    getConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setActiveTab(
    key: string,
    inline: ScrollLogicalPosition = 'nearest',
  ) {
    if (activeTabRef.current === key) return;
    tabInlineRef.current = inline;
    activeTabRef.current = key;
    setActiveTabState(key);
  }

  function scrollToSection(key: string, lockScrollSpy = false) {
    const el = sectionRefs.current[key];
    const scroller = contentRef.current;
    if (!el) return;

    if (!scroller) {
      el.scrollIntoView({
        behavior: 'auto',
        block: 'start',
        inline: 'nearest',
      });
      return;
    }

    const scrollerTop = scroller.getBoundingClientRect().top;
    const targetTop = el.getBoundingClientRect().top;
    const scrollPaddingTop =
      Number.parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
    const scrollToSection = (offset: number) => {
      scroller.scrollTo({
        top: Math.max(0, scroller.scrollTop + targetTop - scrollerTop - offset),
        behavior: 'auto',
      });
    };

    if (finishProgrammaticRef.current) {
      scroller.removeEventListener('scrollend', finishProgrammaticRef.current);
      finishProgrammaticRef.current = null;
    }

    if (!lockScrollSpy) {
      programmaticRef.current = false;
      scrollToSection(scrollPaddingTop);
      return;
    }

    const offset = tabOffsetRef.current;
    const alreadyAtTarget = Math.abs(targetTop - (scrollerTop + offset)) <= 1;

    if (alreadyAtTarget) {
      programmaticRef.current = false;
      return;
    }

    const finish = () => {
      programmaticRef.current = false;
      finishProgrammaticRef.current = null;
    };

    finishProgrammaticRef.current = finish;
    programmaticRef.current = true;
    scroller.addEventListener('scrollend', finish, { once: true });
    scrollToSection(Math.max(offset, scrollPaddingTop));
  }

  function handleTabClick(key: string) {
    setActiveTab(key, 'center');
    setSearchParams({ tab: key }, { replace: true });
    scrollToSection(key, true);
  }

  function cancelChanges() {
    setShowCancelConfirm(false);
    setSaveError(null);
    getConfig();
  }

  function getSectionKey(group: string) {
    if (group === 'downloader') return 'download';
    if (group === 'rss_parser') return 'parser';
    if (group === 'bangumi_manage') return 'manage';
    if (group === 'experimental_openai') return 'openai';
    if (group === 'program' || group === 'log') return 'normal';
    return group;
  }

  function focusConfigError(error: (typeof errors)[number]) {
    const sectionKey = getSectionKey(error.group);
    setActiveTab(sectionKey, 'center');
    setSearchParams({ tab: sectionKey }, { replace: true });
    scrollToSection(sectionKey, true);

    requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(
        `[data-config-field="${error.group}.${error.field}"]`,
      );
      const control = field?.querySelector<HTMLElement>(
        'input, button, [role="combobox"], [role="switch"], textarea, select',
      );
      control?.focus();
    });
  }

  async function applyChanges() {
    if (saving) return;

    if (errors.length > 0) {
      focusConfigError(errors[0]);
      return;
    }

    setSaveError(null);
    setSaving(true);
    try {
      const success = await setConfig();
      if (success) {
        message.success(t('config.save_success'));
      } else {
        setSaveError(t('config.save_failed'));
      }
    } finally {
      setSaving(false);
    }
  }

  // Warn before browser reload/close while there are unsaved changes.
  useEffect(() => {
    if (!configChanged) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [configChanged]);

  // Block in-app route navigation (sidebar links, back/forward) while dirty;
  // `?tab=` changes keep the same pathname and never trigger the blocker.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (nextLocation.pathname === currentLocation.pathname) return false;
    const state = useConfigStore.getState();
    return hasConfigChanges(
      state.config,
      state.savedConfig,
      state.useApiKey,
      state.savedUseApiKey,
    );
  });

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowLeaveConfirm(true);
    }
  }, [blocker.state]);

  function confirmLeave() {
    setShowLeaveConfirm(false);
    blocker.proceed?.();
  }

  function handleLeaveShowChange(show: boolean) {
    setShowLeaveConfirm(show);
    // Dialog dismissed without confirming — abort the pending navigation.
    if (!show && blocker.state === 'blocked') {
      blocker.reset();
    }
  }

  // Cmd/Ctrl+S saves when possible.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const state = useConfigStore.getState();
        const dirty = hasConfigChanges(
          state.config,
          state.savedConfig,
          state.useApiKey,
          state.savedUseApiKey,
        );
        if (dirty && !getConfigErrors(state.config, state.useApiKey).length) {
          applyChanges();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Follow the `?tab=` param whenever it changes — on mount, on intra-route
  // navigation, and on back/forward — so the active strip and scroll position
  // always match the URL, without remounting the page.
  useEffect(() => {
    const param = searchParams.get('tab');
    const key = CONFIG_SECTIONS.some((s) => s.key === param)
      ? (param as string)
      : 'normal';
    const shouldScroll =
      !initialUrlSyncRef.current || activeTabRef.current !== key;

    setActiveTab(key);
    if (shouldScroll) {
      scrollToSection(key);
    }
    initialUrlSyncRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // When the active tab changes, reveal it in the scrollable strip using the
  // browser-native behavior, but only if it's currently out of view. This keeps
  // tabs reachable when the strip overflows, without the custom scroll hack.
  useEffect(() => {
    const tab = tabRefs.current[activeTab];
    const strip = tabListRef.current;
    if (!tab || !strip) return;

    const tabRect = tab.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();
    const isFullyVisible =
      tabRect.left >= stripRect.left && tabRect.right <= stripRect.right;
    const inline = tabInlineRef.current;

    tabInlineRef.current = 'nearest';
    if (inline === 'nearest' && isFullyVisible) return;

    tab.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline,
    });
  }, [activeTab]);

  useEffect(() => {
    const scroller = contentRef.current;
    if (!scroller) return;
    let frameId: number | null = null;

    const updateActiveTab = () => {
      const scrollerTop = scroller.getBoundingClientRect().top;
      const activationLine = scrollerTop + tabOffsetRef.current;
      let activeKey = CONFIG_SECTIONS[0].key;

      // When scrolled to (or past) the bottom, the last section's top can never
      // cross the activation line because there's no more content to push it up.
      // Force the last section active so scrollspy doesn't strand an item short.
      const atBottom =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 1;
      if (atBottom) {
        setActiveTab(CONFIG_SECTIONS[CONFIG_SECTIONS.length - 1].key);
        return;
      }

      for (const section of CONFIG_SECTIONS) {
        const el = sectionRefs.current[section.key];
        if (el && el.getBoundingClientRect().top <= activationLine) {
          activeKey = section.key;
        }
      }

      setActiveTab(activeKey);
    };

    const handleScroll = () => {
      if (programmaticRef.current) return;

      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        if (!programmaticRef.current) updateActiveTab();
      });
    };

    // React's onScroll listener is not passive. Register the native listener
    // explicitly so scrolling never waits for this scroll-spy calculation.
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveTab();

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      if (finishProgrammaticRef.current) {
        scroller.removeEventListener(
          'scrollend',
          finishProgrammaticRef.current,
        );
        finishProgrammaticRef.current = null;
      }
      programmaticRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderSections = () => (
    <div className="space-y-8">
      {CONFIG_SECTIONS.map((section) => (
        <section
          key={section.key}
          id={section.key}
          ref={(el) => {
            sectionRefs.current[section.key] = el;
          }}
          className="min-w-0 scroll-mt-0"
        >
          <h2 className="text-brand mb-2 pl-4 font-sans text-[15px] font-semibold select-text lg:font-medium">
            {t(section.titleKey)}
          </h2>
          <Card className="overflow-hidden rounded-2xl [--card-spacing:0px]">
            <CardContent className="px-4 py-2">
              {loaded ? (
                <section.Comp errors={errors} />
              ) : (
                <ConfigSectionSkeleton />
              )}
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );

  function renderFooterStatus() {
    if (saveError) {
      return (
        <span className="text-destructive inline-flex min-h-5 items-center gap-1.5 text-xs">
          <span className="size-1.5 rounded-full bg-current" />
          {saveError}
        </span>
      );
    }

    if (configChanged && !hasErrors) {
      return (
        <span className="inline-flex min-h-5 items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <span className="size-1.5 rounded-full bg-current" />
          {t('config.unsaved')}
        </span>
      );
    }

    if (hasErrors) {
      return (
        <span className="text-destructive inline-flex min-h-5 items-center gap-1.5 text-xs">
          <span className="size-1.5 rounded-full bg-current" />
          {t('config.invalid')}
        </span>
      );
    }

    return <span className="inline-flex min-h-5" />;
  }

  const renderFooterActions = () => (
    <>
      <AbButton
        type="outline"
        className="h-9 min-w-20 sm:min-w-24"
        onClick={() => setShowCancelConfirm(true)}
        disabled={!configChanged || saving}
      >
        {t('config.cancel')}
      </AbButton>

      <AbButton
        type="brand"
        className="h-9 min-w-24 sm:min-w-28"
        onClick={applyChanges}
        loading={saving}
        disabled={!configChanged || saving}
      >
        {t('config.apply')}
      </AbButton>
    </>
  );

  const layoutProps = {
    sections: CONFIG_SECTIONS,
    activeTab,
    onSelectTab: (key: string) => handleTabClick(key),
    tabListRef,
    tabRefs,
    contentRef,
    renderSections,
    renderFooterStatus,
    renderFooterActions,
    showFooter: configChanged,
    showLeaveConfirm,
    onLeaveShowChange: handleLeaveShowChange,
    onConfirmLeave: confirmLeave,
    showCancelConfirm,
    onCancelShowChange: setShowCancelConfirm,
    onCancelChanges: cancelChanges,
    confirmTitle: t('config.cancel_confirm.title'),
    confirmMessage: t('config.cancel_confirm.message'),
  };

  return isPc ? (
    <ConfigPc {...layoutProps} />
  ) : (
    <ConfigMobile {...layoutProps} />
  );
}
