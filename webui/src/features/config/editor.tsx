import { Button } from '@/components/ui/button';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from '@/lib/message';
import { returnUserLangMsg } from '@/lib/i18n';
import { AbConfirm } from '@/components/shared/ab-confirm';
import { apiConfig } from './api';
import { apiProgram } from '../program/api';
import { configKeys, configOptions } from './queries';
import { ConfigPageLayout } from './layout';
import { ConfigSections } from './sections';
import { ConfigDraftContext, useConfigDraftState } from './config-draft';
import { CONFIG_SECTIONS } from './section-registry';
import { useConfigSectionNavigation } from './use-config-section-navigation';
import type { Config } from './types/config';

export function ConfigEditor({ fetchedConfig }: { fetchedConfig: Config }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const {
    config,
    useApiKey,
    setUseApiKey,
    updateGroup,
    isDirty,
    errors,
    hasErrors,
    resetDraft,
    adoptSavedConfig,
  } = useConfigDraftState(fetchedConfig);
  const {
    activeTab,
    tabListRef,
    tabRefs,
    contentRef,
    sectionRefs,
    selectSection,
    focusConfigError,
  } = useConfigSectionNavigation();
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);
  const [openLeaveConfirm, setOpenLeaveConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function cancelChanges() {
    setOpenCancelConfirm(false);
    setSaveError(null);
    resetDraft();
    void queryClient.refetchQueries({
      queryKey: configOptions().queryKey,
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
        adoptSavedConfig(savedConfig);
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
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Block in-app route navigation (sidebar links, back/forward) while dirty;
  // `?tab=` changes keep the same pathname and never trigger the blocker.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (nextLocation.pathname === currentLocation.pathname) return false;
    return isDirty;
  });

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setOpenLeaveConfirm(true);
    }
  }, [blocker.state]);

  function confirmLeave() {
    setOpenLeaveConfirm(false);
    blocker.proceed?.();
  }

  function handleLeaveOpenChange(open: boolean) {
    setOpenLeaveConfirm(open);
    if (!open && blocker.state === 'blocked') {
      blocker.reset();
    }
  }

  const handleSaveShortcut = useEffectEvent((e: KeyboardEvent) => {
    if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's')) return;

    e.preventDefault();
    if (isDirty && !hasErrors) {
      applyChanges();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
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

    if (isDirty && !hasErrors) {
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
        onClick={() => setOpenCancelConfirm(true)}
        disabled={!isDirty || saveMutation.isPending}
      >
        {t('config.cancel')}
      </Button>

      <Button
        variant="brand"
        className="h-9 min-w-24 sm:min-w-28"
        onClick={applyChanges}
        loading={saveMutation.isPending}
        disabled={!isDirty || saveMutation.isPending}
      >
        {t('config.apply')}
      </Button>
    </>
  );

  const layoutProps = {
    sections: CONFIG_SECTIONS,
    activeTab,
    onSelectTab: (key: string) => selectSection(key),
    tabListRef,
    tabRefs,
    contentRef,
    content,
    footer: isDirty
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
          setUseApiKey,
          errors,
        }}
      >
        <ConfigPageLayout {...layoutProps} />
      </ConfigDraftContext.Provider>
      <AbConfirm
        open={openLeaveConfirm}
        onOpenChange={handleLeaveOpenChange}
        title={t('config.cancel_confirm.title')}
        onConfirm={confirmLeave}
      >
        {t('config.cancel_confirm.message')}
      </AbConfirm>
      <AbConfirm
        open={openCancelConfirm}
        onOpenChange={setOpenCancelConfirm}
        title={t('config.cancel_confirm.title')}
        onConfirm={cancelChanges}
      >
        {t('config.cancel_confirm.message')}
      </AbConfirm>
    </>
  );
}
