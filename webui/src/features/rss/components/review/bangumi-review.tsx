import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BangumiRule } from '@/features/bangumi/types';
import type { RSSAPI } from '../../types/rss.ts';
import { AbRule } from '@/features/bangumi/components/rule/ab-rule';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useRssReviewMutations } from './use-rss-review-mutations.ts';

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
  const { t } = useTranslation();
  const [editedRule, setEditedRule] = useState(() => rule);
  const { collect, subscribe, isPending } = useRssReviewMutations({
    rss,
    onComplete,
  });

  return (
    <>
      <AbRule rule={editedRule} onChange={setEditedRule} />

      <Separator />

      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        {onBack && (
          <Button
            variant="outline"
            className="col-start-1 row-start-1 h-10 w-full sm:col-auto sm:row-auto sm:mr-auto sm:h-8 sm:w-auto"
            disabled={isPending}
            onClick={onBack}
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
          loading={collect.isPending}
          disabled={isPending}
          onClick={() => collect.mutate(editedRule)}
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
          loading={subscribe.isPending}
          disabled={isPending}
          onClick={() => subscribe.mutate(editedRule)}
        >
          {t('topbar.add.subscribe')}
        </Button>
      </div>
    </>
  );
}
