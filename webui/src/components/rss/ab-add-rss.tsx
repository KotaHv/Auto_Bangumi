import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiDownload } from '@/api/download';
import { apiRSS } from '@/api/rss';
import { message } from '@/lib/message';
import { bangumiKeys, rssKeys } from '@/query/options';
import { returnUserLangMsg } from '@/i18n';
import { rssTemplate } from '@/constants/rss';
import type { BangumiRule } from '@/types/bangumi';
import type { RSS } from '@/types/rss';
import { AbSelect } from '@/components/common/ab-select';
import { Switch } from '@/components/ui/switch';
import { AbPopup } from '@/components/common/ab-popup';
import { Input } from '@/components/ui/input';
import { AbRule } from '@/components/bangumi/rule/ab-rule';
import { Field, FieldLabel } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';

const PARSER_TYPE = [
  { value: 'mikan', label: 'mikan' },
  { value: 'tmdb', label: 'tmdb' },
  { value: 'parser', label: 'parser' },
];

interface AbAddRssProps {
  show: boolean;
  onShowChange: (show: boolean) => void;
  rule: BangumiRule;
  onRuleChange: (rule: BangumiRule) => void;
}

export function AbAddRss({
  show,
  onShowChange,
  rule,
  onRuleChange,
}: AbAddRssProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [rss, setRss] = useState<RSS>(rssTemplate);
  const [windowState, setWindowState] = useState({ rule: false, next: false });
  const addMutation = useMutation({
    mutationFn: apiRSS.add,
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      await queryClient.invalidateQueries({ queryKey: rssKeys.list() });
      onShowChange(false);
    },
  });
  const analysisMutation = useMutation({
    mutationFn: apiDownload.analysis,
    onSuccess: (data) => {
      onRuleChange(data);
      setWindowState((s) => ({ ...s, next: true, rule: true }));
    },
  });
  const collectMutation = useMutation({
    mutationFn: apiDownload.collection,
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      await queryClient.invalidateQueries({ queryKey: bangumiKeys.list() });
      onShowChange(false);
    },
  });
  const subscribeMutation = useMutation({
    mutationFn: ({ rule, rss }: { rule: BangumiRule; rss: RSS }) =>
      apiDownload.subscribe(rule, rss),
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bangumiKeys.list() }),
        queryClient.invalidateQueries({ queryKey: rssKeys.list() }),
      ]);
      onShowChange(false);
    },
  });

  useEffect(() => {
    if (!show) {
      setRss(rssTemplate);
      window.setTimeout(() => {
        setWindowState((s) => ({ ...s, next: false }));
      }, 300);
    } else if (rule.official_title !== '') {
      setWindowState((s) => ({ ...s, next: true, rule: true }));
    }
  }, [show]);

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

  function collect() {
    collectMutation.mutate(rule);
  }

  function subscribe() {
    subscribeMutation.mutate({ rule, rss });
  }

  return (
    <AbPopup
      title={t('topbar.add.title')}
      show={show}
      onShowChange={onShowChange}
      width="xl"
      className="shadow-2xl"
    >
      {!windowState.next ? (
        <div>
          <div className="space-y-4">
            <Field>
              <FieldLabel>{t('topbar.add.rss_link')}</FieldLabel>
              <Input
                variant="large"
                value={rss.url}
                onChange={(e) => setRss((s) => ({ ...s, url: e.target.value }))}
                placeholder={t('topbar.add.placeholder_link')}
              />
            </Field>

            <Field>
              <FieldLabel>{t('topbar.add.name')}</FieldLabel>
              <Input
                variant="large"
                value={rss.name}
                onChange={(e) =>
                  setRss((s) => ({ ...s, name: e.target.value }))
                }
                placeholder={t('topbar.add.placeholder_name')}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
              <div className="sm:justify-self-start">
                <Field
                  orientation="horizontal"
                  className="min-h-9 w-full items-center justify-between gap-3 sm:w-fit sm:justify-start sm:gap-2"
                >
                  <FieldLabel>{t('topbar.add.aggregate')}</FieldLabel>
                  <Switch
                    checked={rss.aggregate}
                    onCheckedChange={(aggregate) =>
                      setRss((s) => ({ ...s, aggregate }))
                    }
                    size="lg"
                  />
                </Field>
              </div>

              <div className="sm:justify-self-end">
                <Field
                  orientation="horizontal"
                  className="min-h-9 items-center justify-between gap-2 sm:w-fit sm:justify-start"
                >
                  <FieldLabel>{t('topbar.add.parser')}</FieldLabel>
                  <AbSelect
                    value={rss.parser}
                    items={PARSER_TYPE}
                    triggerClassName="w-24 sm:w-24"
                    onValueChange={(parser) =>
                      setRss((s) => ({ ...s, parser }))
                    }
                  />
                </Field>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-end">
            <Button
              variant="brand"
              className="h-10 w-full sm:h-8 sm:w-auto sm:min-w-20"
              loading={addMutation.isPending || analysisMutation.isPending}
              onClick={addRss}
            >
              {t('topbar.add.button')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <AbRule rule={rule} onChange={onRuleChange} />

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button
              variant="outline"
              className="h-10 w-full sm:h-8 sm:w-auto sm:min-w-20"
              loading={collectMutation.isPending}
              onClick={collect}
            >
              {t('topbar.add.collect')}
            </Button>

            <Button
              variant="brand"
              className="h-10 w-full sm:h-8 sm:w-auto sm:min-w-20"
              loading={subscribeMutation.isPending}
              onClick={subscribe}
            >
              {t('topbar.add.subscribe')}
            </Button>
          </div>
        </div>
      )}
    </AbPopup>
  );
}
