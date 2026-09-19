import { Button } from '@/components/ui/button';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AbConfirm } from '@/components/shared/ab-confirm';
import { configOptions } from '../queries';
import { ConfigPageLayout } from '../components/layout/page-layout';
import { ConfigSections } from '../components/layout/sections';
import { ConfigDraftContext, useConfigDraftState } from './config-draft';
import { CONFIG_SECTIONS } from './section-registry';
import { useConfigSectionNavigation } from './hooks/use-config-section-navigation';
import { useConfigSave } from './hooks/use-config-save';
import type { Config } from '../types/config';

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
  const { saveConfig, isSaving, saveError, clearSaveError } = useConfigSave({
    config,
    useApiKey,
    onSavedConfig: adoptSavedConfig,
  });
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);
  const [openLeaveConfirm, setOpenLeaveConfirm] = useState(false);

  function cancelChanges() {
    setOpenCancelConfirm(false);
    clearSaveError();
    resetDraft();
    void queryClient.refetchQueries({
      queryKey: configOptions().queryKey,
    });
  }

  function applyChanges() {
    if (errors.length > 0) {
      focusConfigError(errors[0]);
      return;
    }

    void saveConfig();
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
        disabled={!isDirty || isSaving}
      >
        {t('config.cancel')}
      </Button>

      <Button
        variant="brand"
        className="h-9 min-w-24 sm:min-w-28"
        onClick={applyChanges}
        loading={isSaving}
        disabled={!isDirty || isSaving}
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
