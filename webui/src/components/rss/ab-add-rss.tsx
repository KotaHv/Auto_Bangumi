import { CirclePlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiDownload } from '@/api/download';
import { apiRSS } from '@/api/rss';
import { message } from '@/lib/message';
import { rssKeys, bangumiKeys } from '@/query/options';
import { returnUserLangMsg } from '@/i18n';
import { initialRss } from '@/constants/rss';
import type { RSS } from '@/types/rss';
import { AbPopup } from '@/components/common/ab-popup';
import { AbBangumiReview } from '@/components/bangumi/ab-bangumi-review';
import { Button } from '@/components/ui/button';
import { AbAddRssForm } from './ab-add-rss-form';

export function AbAddRss() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [rss, setRss] = useState<RSS>(initialRss);
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
      title={
        analysisMutation.data
          ? t('homepage.rule.edit_rule')
          : t('topbar.add.title')
      }
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
      {analysisMutation.data ? (
        <AbBangumiReview
          rule={analysisMutation.data}
          rss={rss}
          onBack={() => analysisMutation.reset()}
          onComplete={() => setOpen(false)}
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
