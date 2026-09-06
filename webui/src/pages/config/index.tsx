import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Download,
  FileSearch,
  ListChecks,
  Network,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { message } from '@/lib/message';
import { returnUserLangMsg } from '@/i18n';
import { AbConfirm } from '@/components/common/ab-confirm';
import { ConfigDownload } from '@/components/config/download';
import { ConfigLoadError } from '@/components/config/config-load-error';
import { ConfigManage } from '@/components/config/manage';
import { ConfigNormal } from '@/components/config/normal';
import { ConfigNotification } from '@/components/config/notification';
import { ConfigOpenAI } from '@/components/config/openai';
import { ConfigParser } from '@/components/config/parser';
import { ConfigProxy } from '@/components/config/proxy';
import { apiConfig } from '@/api/config';
import { apiProgram } from '@/api/program';
import { configKeys, configOptions } from '@/query/options';
import { getConfigErrors } from '@/lib/config-validation';
import { ConfigPageLayout } from './layout';
import { ConfigLoadingView } from './loading';
import { ConfigSections } from './sections';
import { ConfigDraftContext, type ConfigSection } from './types';
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
  const ref = useRef(0);

  return { tabOffsetRef: ref };
};

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
  const configQuery = useQuery(configOptions());

  if (configQuery.isPending) {
    return <ConfigLoadingView sections={CONFIG_SECTIONS} />;
  }

  if (!configQuery.data) {
    return <ConfigLoadError onRetry={() => void configQuery.refetch()} />;
  }

  return <ConfigEditor fetchedConfig={configQuery.data} />;
}

function ConfigEditor({ fetchedConfig }: { fetchedConfig: Config }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [draftConfig, setDraftConfig] = useState<Config>();
  const [draftUseApiKey, setDraftUseApiKey] = useState<boolean>();

  useEffect(() => {
    if (!draftConfig) {
      setDraftConfig(fetchedConfig);
      setDraftUseApiKey(!!fetchedConfig.downloader.api_key);
    }
  }, [draftConfig, fetchedConfig]);

  const config = draftConfig ?? fetchedConfig;
  const savedConfig = fetchedConfig;
  const useApiKey = draftUseApiKey ?? !!fetchedConfig.downloader.api_key;
  const savedUseApiKey = !!fetchedConfig.downloader.api_key;

  function shallowEqual<T extends object>(a: T, b: T) {
    const keys = Object.keys(a) as Array<keyof T>;
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.is(a[key], b[key]))
    );
  }

  function updateGroup<TKey extends keyof Config>(
    key: TKey,
    patch: Partial<Config[TKey]>,
  ) {
    setDraftConfig((current) => {
      const base = current ?? config;
      const nextGroup = { ...base[key], ...patch };
      return {
        ...base,
        [key]: shallowEqual(nextGroup, savedConfig[key])
          ? savedConfig[key]
          : nextGroup,
      };
    });
  }
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
  const [saveError, setSaveError] = useState<string | null>(null);

  const { tabOffsetRef } = useTabOffset();
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLElement | null>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const activeTabRef = useRef(activeTab);
  const programmaticRef = useRef(false);
  const finishProgrammaticRef = useRef<(() => void) | null>(null);
  const tabInlineRef = useRef<ScrollLogicalPosition>('nearest');
  const initialUrlSyncRef = useRef(false);

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
    setDraftConfig(undefined);
    setDraftUseApiKey(undefined);
    void queryClient.refetchQueries({
      queryKey: configOptions().queryKey,
    });
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

  const restartMutation = useMutation({
    mutationFn: apiProgram.restart,
    onSuccess: (data) => message.success(returnUserLangMsg(data)),
  });
  const saveMutation = useMutation({
    mutationFn: ({ next }: { next: Config }) => apiConfig.updateConfig(next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: configKeys.current() });
      const savedConfig = queryClient.getQueryData<Config>(
        configKeys.current(),
      );
      if (savedConfig) {
        setDraftConfig(savedConfig);
        setDraftUseApiKey(!!savedConfig.downloader.api_key);
      }
      restartMutation.mutate();
    },
  });

  async function applyChanges() {
    if (saveMutation.isPending) return;

    if (errors.length > 0) {
      focusConfigError(errors[0]);
      return;
    }

    setSaveError(null);
    const next: Config = {
      ...config,
      downloader: { ...config.downloader, api_key: null },
    };
    if (useApiKey) {
      const key = config.downloader.api_key?.trim() ?? '';
      if (!key) {
        message.warning(
          t('notify.please_enter', {
            field: t('config.downloader_set.api_key'),
          }),
        );
        return;
      }
      if (!/^qbt_[A-Za-z0-9]{28}$/.test(key)) {
        message.error(t('notify.api_key_format_error'));
        return;
      }
      next.downloader = { ...config.downloader, api_key: key };
    }
    try {
      await saveMutation.mutateAsync({ next });
      message.success(t('config.save_success'));
    } catch {
      setSaveError(t('config.save_failed'));
    }
  }

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
    return configChanged;
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
    if (!show && blocker.state === 'blocked') {
      blocker.reset();
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const dirty = hasConfigChanges(
          config,
          savedConfig,
          useApiKey,
          savedUseApiKey,
        );
        if (dirty && !hasErrors) {
          applyChanges();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [config, savedConfig, useApiKey, savedUseApiKey, saveMutation.isPending]);

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

  useEffect(() => {
    const tab = tabRefs.current[activeTab];
    const strip = tabListRef.current;
    if (!tab || !strip) return;

    const inline = tabInlineRef.current;
    tabInlineRef.current = 'nearest';

    if (inline === 'center') {
      tab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
      return;
    }

    const timer = window.setTimeout(() => {
      const tabRect = tab.getBoundingClientRect();
      const stripRect = strip.getBoundingClientRect();

      const isFullyVisible =
        tabRect.left >= stripRect.left && tabRect.right <= stripRect.right;

      if (isFullyVisible) return;

      tab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }, 40);

    return () => window.clearTimeout(timer);
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

  const content = (
    <ConfigSections
      sections={CONFIG_SECTIONS}
      sectionRefs={sectionRefs}
      renderSection={(section) => <section.Comp />}
    />
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
      <Button
        variant="outline"
        className="h-9 min-w-20 sm:min-w-24"
        onClick={() => setShowCancelConfirm(true)}
        disabled={!configChanged || saveMutation.isPending}
      >
        {t('config.cancel')}
      </Button>

      <Button
        variant="brand"
        className="h-9 min-w-24 sm:min-w-28"
        onClick={applyChanges}
        loading={saveMutation.isPending}
        disabled={!configChanged || saveMutation.isPending}
      >
        {t('config.apply')}
      </Button>
    </>
  );

  const layoutProps = {
    sections: CONFIG_SECTIONS,
    activeTab,
    onSelectTab: (key: string) => handleTabClick(key),
    tabListRef,
    tabRefs,
    contentRef,
    content,
    footer: configChanged
      ? {
          status: renderFooterStatus(),
          actions: renderFooterActions(),
        }
      : undefined,
  };

  return (
    <>
      <ConfigDraftContext.Provider
        value={{
          config,
          updateGroup,
          useApiKey,
          setUseApiKey: setDraftUseApiKey,
          errors,
        }}
      >
        <ConfigPageLayout {...layoutProps} />
      </ConfigDraftContext.Provider>
      <AbConfirm
        show={showLeaveConfirm}
        onShowChange={handleLeaveShowChange}
        title={t('config.cancel_confirm.title')}
        onConfirm={confirmLeave}
      >
        {t('config.cancel_confirm.message')}
      </AbConfirm>
      <AbConfirm
        show={showCancelConfirm}
        onShowChange={setShowCancelConfirm}
        title={t('config.cancel_confirm.title')}
        onConfirm={cancelChanges}
      >
        {t('config.cancel_confirm.message')}
      </AbConfirm>
    </>
  );
}
