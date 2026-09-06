import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRSS } from '@/api/rss';
import { bangumiKeys, rssKeys, rssListOptions } from '@/query/options';
import { message } from '@/lib/message';
import { returnUserLangMsg } from '@/i18n';
import { useIsDesktop } from '@/hooks/use-desktop';
import { RSSMobile } from './mobile';
import { RSSDesktop } from './desktop';
import type { RSSLayoutProps } from './types';

export default function RSSPage() {
  const { data: rss = [] } = useQuery(rssListOptions());
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
      const allSelected = rss.length > 0 && ids.length === rss.length;
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

  const props: RSSLayoutProps = {
    rss,
    selectedRSS,
    setSelectedRSS,
    enableSelected,
    disableSelected,
    deleteSelected,
    refreshSelected,
  };

  return isDesktop ? <RSSDesktop {...props} /> : <RSSMobile {...props} />;
}
