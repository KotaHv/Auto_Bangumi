import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiDownload } from '@/api/download';
import { apiRSS } from '@/api/rss';
import { message } from '@/lib/message';
import { rssKeys } from '@/query/options';
import { returnUserLangMsg } from '@/i18n';
import { initialRss } from '@/constants/rss';
import type { RSS } from '@/types/rss';
import { AbPopup } from '@/components/common/ab-popup';
import { AbBangumiReview } from '@/components/bangumi/ab-bangumi-review';
import { AbAddRssForm } from './ab-add-rss-form';

interface AbAddRssProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AbAddRss({ open, onOpenChange }: AbAddRssProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [rss, setRss] = useState<RSS>(initialRss);
  const addMutation = useMutation({
    mutationFn: apiRSS.add,
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      await queryClient.invalidateQueries({ queryKey: rssKeys.list() });
      onOpenChange(false);
    },
  });
  const analysisMutation = useMutation({
    mutationFn: apiDownload.analysis,
  });

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

  return (
    <AbPopup
      title={
        analysisMutation.data
          ? t('homepage.rule.edit_rule')
          : t('topbar.add.title')
      }
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(open) => {
        if (open) return;

        setRss(initialRss);
        analysisMutation.reset();
        addMutation.reset();
      }}
      width="xl"
      className="shadow-2xl"
    >
      {analysisMutation.data ? (
        <AbBangumiReview
          rule={analysisMutation.data}
          rss={rss}
          onBack={() => analysisMutation.reset()}
          onComplete={() => onOpenChange(false)}
        />
      ) : (
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
      )}
    </AbPopup>
  );
}
