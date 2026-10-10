import { CirclePlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRSS } from '../../api.ts';
import { message } from '@/lib/message';
import { bangumiKeys } from '@/features/bangumi/queries';
import { rssKeys } from '../../queries.ts';
import { returnUserLangMsg } from '@/lib/i18n';
import { initialRss } from '../../constants.ts';
import type { RSSDraft } from '../../types/rss.ts';
import { AbPopup } from '@/components/shared/ab-popup';
import { Button } from '@/components/ui/button';
import { AbAddRssForm } from './form.tsx';
import { AbBangumiReview } from '../review/bangumi-review.tsx';
import { AbRssCandidateSelection } from '../review/candidate-selection.tsx';
import { AbRssExactMatch } from '../review/exact-match.tsx';

export function AbAddRss() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [rss, setRss] = useState<RSSDraft>(initialRss);
  const addMutation = useMutation({
    mutationFn: apiRSS.add,
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bangumiKeys.list() }),
        queryClient.invalidateQueries({ queryKey: rssKeys.list() }),
      ]);
      setOpen(false);
    },
  });
  const analysisMutation = useMutation({ mutationFn: apiRSS.analysis });

  function backToRssForm() {
    analysisMutation.reset();
  }

  function addRss() {
    if (rss.url === '') {
      message.error(
        t('notify.please_enter', {
          field: t('notify.rss_link'),
        }),
      );
    } else if (rss.aggregate) {
      addMutation.mutate(rss);
    } else {
      analysisMutation.mutate(rss);
    }
  }

  function renderReviewView() {
    const analysis = analysisMutation.data;
    if (!analysis) {
      return (
        <AbAddRssForm
          rss={rss}
          loading={addMutation.isPending || analysisMutation.isPending}
          onChange={(patch) =>
            setRss((rss) => ({
              ...rss,
              ...patch,
            }))
          }
          onSubmit={addRss}
        />
      );
    }

    const firstOption = analysis.options[0];
    if (firstOption.type === 'exact_match') {
      return (
        <AbRssExactMatch
          rule={firstOption.bangumi}
          rss={rss}
          onBack={backToRssForm}
          onComplete={() => setOpen(false)}
        />
      );
    }

    if (firstOption.type === 'create') {
      return (
        <AbBangumiReview
          rule={firstOption.bangumi}
          rss={rss}
          onBack={backToRssForm}
          onComplete={() => setOpen(false)}
        />
      );
    }

    return (
      <AbRssCandidateSelection
        options={analysis.options}
        rss={rss}
        onBack={backToRssForm}
        onComplete={() => setOpen(false)}
      />
    );
  }

  return (
    <AbPopup
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label="add rss"
          title="add rss"
        >
          <CirclePlus />
        </Button>
      }
      title={t('topbar.add.title')}
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(open) => {
        if (open) return;

        setRss(initialRss);
        analysisMutation.reset();
        addMutation.reset();
      }}
      width="xl"
      className="shadow-2xl"
    >
      {renderReviewView()}
    </AbPopup>
  );
}
