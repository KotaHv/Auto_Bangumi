import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import type { BangumiRule } from '@/features/bangumi/types';
import type { RSSAPI } from '../types/rss';
import { apiRSS } from '../api';
import { message } from '@/lib/message';
import { bangumiKeys } from '@/features/bangumi/queries';
import { rssKeys } from '../queries';
import { returnUserLangMsg } from '@/lib/i18n';
import { AbRule } from '@/features/bangumi/components/rule/ab-rule';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AbBangumiReviewProps {
  rule: BangumiRule;
  rss: RSSAPI;
  onComplete: () => void;
  onBack?: () => void;
}

export function AbBangumiReview({
  rule,
  rss,
  onComplete,
  onBack,
}: AbBangumiReviewProps) {
  const [draftRule, setDraftRule] = useState(() => rule);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const collectMutation = useMutation({
    mutationFn: () => apiRSS.collection(draftRule),
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      onComplete();
    },
  });
  const subscribeMutation = useMutation({
    mutationFn: () => apiRSS.subscribe(draftRule, rss),
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bangumiKeys.list() }),
        queryClient.invalidateQueries({ queryKey: rssKeys.list() }),
      ]);
      onComplete();
    },
  });

  return (
    <>
      <AbRule rule={draftRule} onChange={setDraftRule} />

      <Separator />

      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        {onBack && (
          <Button
            variant="outline"
            className="col-start-1 row-start-1 h-10 w-full sm:col-auto sm:row-auto sm:mr-auto sm:h-8 sm:w-auto"
            onClick={() => {
              onBack();
            }}
          >
            <ArrowLeft />
            {t('topbar.add.back')}
          </Button>
        )}

        <Button
          variant="outline"
          className={
            onBack
              ? 'col-start-2 row-start-1 h-10 w-full sm:col-auto sm:row-auto sm:h-8 sm:w-auto sm:min-w-20'
              : 'h-10 w-full sm:h-8 sm:w-auto sm:min-w-20'
          }
          loading={collectMutation.isPending}
          onClick={() => collectMutation.mutate()}
        >
          {t('topbar.add.collect')}
        </Button>

        <Button
          variant="brand"
          className={
            onBack
              ? 'col-span-2 row-start-2 h-10 w-full sm:col-auto sm:row-auto sm:h-8 sm:w-auto sm:min-w-20'
              : 'h-10 w-full sm:h-8 sm:w-auto sm:min-w-20'
          }
          loading={subscribeMutation.isPending}
          onClick={() => subscribeMutation.mutate()}
        >
          {t('topbar.add.subscribe')}
        </Button>
      </div>
    </>
  );
}
