import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from '@/lib/message';
import { returnUserLangMsg } from '@/lib/i18n';
import { apiConfig } from '../../api';
import { apiProgram } from '../../../program/api';
import { configKeys } from '../../queries';
import type { Config } from '../../types/config';

interface UseConfigSaveOptions {
  config: Config;
  useApiKey: boolean;
  onSavedConfig: (savedConfig: Config) => void;
}

export function useConfigSave({
  config,
  useApiKey,
  onSavedConfig,
}: UseConfigSaveOptions) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

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
        onSavedConfig(savedConfig);
      }
      restartMutation.mutate();
    },
  });

  function clearSaveError() {
    setSaveError(null);
  }

  async function saveConfig() {
    if (saveMutation.isPending) return;

    clearSaveError();
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

  return {
    saveConfig,
    isSaving: saveMutation.isPending,
    saveError,
    clearSaveError,
  };
}
