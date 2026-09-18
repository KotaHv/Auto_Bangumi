import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRSS } from '@/features/rss/api';
import { bangumiKeys } from '@/features/bangumi/queries';
import { rssKeys, rssListOptions } from '@/features/rss/queries';
import { message } from '@/lib/message';
import { returnUserLangMsg } from '@/lib/i18n';
import { useIsDesktop } from '@/hooks/use-desktop';
import { AbLoadError } from '@/components/shared/ab-load-error';
import { RSSMobile } from '@/features/rss/components/mobile';
import { RSSDesktop } from '@/features/rss/components/desktop';
import type { RSSBulkAction, RSSLayoutProps } from '@/features/rss/types/page';

export default function RSSPage() {
  const { t } = useTranslation();
  const rssQuery = useQuery(rssListOptions());
  const rss = rssQuery.data;
  const [selectedRSS, setSelectedRSS] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();

  const enableMutation = useMutation({
    mutationFn: apiRSS.enableMany,
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      setSelectedRSS([]);
      await queryClient.invalidateQueries({ queryKey: rssKeys.list() });
    },
  });
  const disableMutation = useMutation({
    mutationFn: apiRSS.disableMany,
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      setSelectedRSS([]);
      await queryClient.invalidateQueries({ queryKey: rssKeys.list() });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: apiRSS.deleteMany,
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      setSelectedRSS([]);
      await queryClient.invalidateQueries({ queryKey: rssKeys.list() });
    },
  });
  const refreshMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const allSelected =
        rss !== undefined && rss.length > 0 && ids.length === rss.length;
      if (allSelected) return apiRSS.refreshAll();
      await Promise.all(ids.map((id) => apiRSS.refresh(id)));
      return { msg_en: '', msg_zh: '' };
    },
    onSuccess: async (data) => {
      if (data.msg_en || data.msg_zh) message.success(returnUserLangMsg(data));
      setSelectedRSS([]);
      void queryClient.invalidateQueries({
        queryKey: bangumiKeys.list(),
      });
    },
  });

  const enableSelected = async () => {
    await enableMutation.mutateAsync(selectedRSS).catch(() => undefined);
  };
  const disableSelected = async () => {
    await disableMutation.mutateAsync(selectedRSS).catch(() => undefined);
  };
  const deleteSelected = async () => {
    await deleteMutation.mutateAsync(selectedRSS).catch(() => undefined);
  };
  const refreshSelected = async () => {
    await refreshMutation.mutateAsync(selectedRSS).catch(() => undefined);
  };

  const pendingAction: RSSBulkAction | null = enableMutation.isPending
    ? 'enable'
    : disableMutation.isPending
      ? 'disable'
      : deleteMutation.isPending
        ? 'delete'
        : refreshMutation.isPending
          ? 'refresh'
          : null;
  const actionPending = pendingAction !== null;

  if (rssQuery.isLoadingError) {
    return (
      <AbLoadError
        title={t('rss.load_failed')}
        retryLabel={t('rss.retry')}
        onRetry={() => void rssQuery.refetch()}
      />
    );
  }

  const props: RSSLayoutProps = {
    rss: rss ?? [],
    loading: rssQuery.isPending,
    actionPending,
    pendingAction,
    selectedRSS,
    setSelectedRSS,
    enableSelected,
    disableSelected,
    deleteSelected,
    refreshSelected,
  };

  return isDesktop ? <RSSDesktop {...props} /> : <RSSMobile {...props} />;
}
