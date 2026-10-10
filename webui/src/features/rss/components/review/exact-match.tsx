import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BangumiRule } from '@/features/bangumi/types';
import type { RSSAPI } from '../../types/rss.ts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RuleMetadata } from './rule-metadata.tsx';
import { useRssReviewMutations } from './use-rss-review-mutations.ts';

interface AbRssExactMatchProps {
  rule: BangumiRule & { id: number };
  rss: RSSAPI;
  onBack: () => void;
  onComplete: () => void;
}

export function AbRssExactMatch({
  rule,
  rss,
  onBack,
  onComplete,
}: AbRssExactMatchProps) {
  const { t } = useTranslation();
  const { collect, addToBangumi, isPending } = useRssReviewMutations({
    rss,
    onComplete,
  });

  return (
    <>
      <Card size="sm" className="gap-3">
        <CardHeader>
          <CardTitle>{rule.official_title}</CardTitle>
        </CardHeader>
        <CardContent>
          <RuleMetadata season={rule.season} groupName={rule.group_name} />
        </CardContent>
      </Card>

      <Separator />

      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <Button
          variant="outline"
          className="col-start-1 row-start-1 h-10 w-full sm:col-auto sm:row-auto sm:mr-auto sm:h-8 sm:w-auto"
          disabled={isPending}
          onClick={onBack}
        >
          <ArrowLeft />
          {t('topbar.add.back')}
        </Button>
        <Button
          variant="outline"
          className="col-start-2 row-start-1 h-10 w-full sm:col-auto sm:row-auto sm:h-8 sm:w-auto sm:min-w-20"
          loading={collect.isPending}
          disabled={isPending}
          onClick={() => collect.mutate(rule)}
        >
          {t('topbar.add.collect')}
        </Button>
        <Button
          variant="brand"
          className="col-span-2 row-start-2 h-10 w-full sm:col-auto sm:row-auto sm:h-8 sm:w-auto sm:min-w-20"
          loading={addToBangumi.isPending}
          disabled={isPending}
          onClick={() => addToBangumi.mutate(rule.id)}
        >
          {t('topbar.add.subscribe')}
        </Button>
      </div>
    </>
  );
}
