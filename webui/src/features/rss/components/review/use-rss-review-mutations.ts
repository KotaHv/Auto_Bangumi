import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BangumiData } from '@/features/bangumi/types';
import { bangumiKeys } from '@/features/bangumi/queries';
import { message } from '@/lib/message';
import { returnUserLangMsg } from '@/lib/i18n';
import { apiRSS } from '../../api.ts';
import { rssKeys } from '../../queries.ts';
import type { RSSAPI } from '../../types/rss.ts';

interface UseRssReviewMutationsOptions {
  rss: RSSAPI;
  onComplete: () => void;
}

export function useRssReviewMutations({
  rss,
  onComplete,
}: UseRssReviewMutationsOptions) {
  const queryClient = useQueryClient();
  const collect = useMutation({
    mutationFn: (rule: BangumiData) => apiRSS.collection(rule),
    onSuccess: (data) => {
      message.success(returnUserLangMsg(data));
      onComplete();
    },
  });
  const onSubscriptionSuccess = async (
    data: Awaited<ReturnType<typeof apiRSS.subscribe>>,
  ) => {
    message.success(returnUserLangMsg(data));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bangumiKeys.list() }),
      queryClient.invalidateQueries({ queryKey: rssKeys.list() }),
    ]);
    onComplete();
  };
  const subscribe = useMutation({
    mutationFn: (rule: BangumiData) => apiRSS.subscribe(rule, rss),
    onSuccess: onSubscriptionSuccess,
  });
  const addToBangumi = useMutation({
    mutationFn: (bangumiId: number) => apiRSS.addToBangumi(rss, bangumiId),
    onSuccess: onSubscriptionSuccess,
  });

  return {
    collect,
    subscribe,
    addToBangumi,
    isPending:
      collect.isPending || subscribe.isPending || addToBangumi.isPending,
  };
}
