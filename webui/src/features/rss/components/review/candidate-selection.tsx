import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BangumiData } from '@/features/bangumi/types';
import type { RSSAnalysis, RSSAPI } from '../../types/rss.ts';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AbBangumiReview } from './bangumi-review.tsx';
import {
  CandidateRuleChoices,
  type AssociationSelection,
} from './candidate-choices.tsx';
import { useRssReviewMutations } from './use-rss-review-mutations.ts';

interface AbRssCandidateSelectionProps {
  options: RSSAnalysis['options'];
  rss: RSSAPI;
  onBack: () => void;
  onComplete: () => void;
}

interface CandidateSelectionViewProps extends AbRssCandidateSelectionProps {
  onCreate: (rule: BangumiData) => void;
}

export function AbRssCandidateSelection(props: AbRssCandidateSelectionProps) {
  const [ruleToCreate, setRuleToCreate] = useState<BangumiData>();

  if (ruleToCreate) {
    return (
      <AbBangumiReview
        rule={ruleToCreate}
        rss={props.rss}
        onBack={() => setRuleToCreate(undefined)}
        onComplete={props.onComplete}
      />
    );
  }

  return <CandidateSelectionView {...props} onCreate={setRuleToCreate} />;
}

function CandidateSelectionView({
  options,
  rss,
  onCreate,
  onBack,
  onComplete,
}: CandidateSelectionViewProps) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<AssociationSelection>();
  const { collect, addToBangumi, isPending } = useRssReviewMutations({
    rss,
    onComplete,
  });
  const selectedRule =
    selection?.type === 'existing'
      ? options.find(
          (option) =>
            option.type === 'candidate' &&
            option.bangumi.id === selection.bangumiId,
        )?.bangumi
      : undefined;
  const primaryAction = (() => {
    if (selection?.type === 'new') {
      return {
        label: 'next' as const,
        loading: false,
        onClick: () => {
          const createRule = options.find(
            (option) => option.type === 'create',
          )?.bangumi;
          if (createRule) onCreate(createRule);
        },
      };
    }
    if (selection?.type === 'existing') {
      const { bangumiId } = selection;
      return {
        label: 'subscribe' as const,
        loading: addToBangumi.isPending,
        onClick: () => addToBangumi.mutate(bangumiId),
      };
    }
  })();

  return (
    <>
      <CandidateRuleChoices
        options={options}
        selection={selection}
        onSelectionChange={setSelection}
      />

      <Separator />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          variant="outline"
          className="h-10 w-full sm:mr-auto sm:h-8 sm:w-auto"
          disabled={isPending}
          onClick={onBack}
        >
          <ArrowLeft data-icon="inline-start" />
          {t('topbar.add.back')}
        </Button>
        {(selectedRule || primaryAction) && (
          <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
            {selectedRule && (
              <Button
                variant="outline"
                className="col-span-2 h-10 w-full sm:col-span-1 sm:h-8 sm:w-auto"
                loading={collect.isPending}
                disabled={isPending}
                onClick={() => collect.mutate(selectedRule)}
              >
                {t('topbar.add.collect')}
              </Button>
            )}
            {primaryAction && (
              <Button
                variant="brand"
                className="col-span-2 h-10 w-full sm:col-span-1 sm:h-8 sm:w-auto sm:min-w-20"
                loading={primaryAction.loading}
                disabled={isPending}
                onClick={primaryAction.onClick}
              >
                {t(`topbar.add.${primaryAction.label}`)}
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
