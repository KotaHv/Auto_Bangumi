import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiDownload } from '@/api/download';
import { apiRSS } from '@/api/rss';
import { message } from '@/lib/message';
import { executeApi } from '@/hooks/use-api';
import { useBangumiStore } from '@/store/bangumi';
import { rssTemplate } from '#/rss';
import type { BangumiRule } from '#/bangumi';
import type { RSS } from '#/rss';
import { AbSelect } from '@/components/basic/ab-select';
import { Switch } from '@/components/ui/switch';
import { AbPopup } from '@/components/basic/ab-popup';
import { Input } from '@/components/ui/input';
import { AbRule } from '@/components/rule/ab-rule';
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
  const { getAll } = useBangumiStore();
  const { t } = useTranslation();

  const [rss, setRss] = useState<RSS>(rssTemplate);
  const [windowState, setWindowState] = useState({
    loading: false,
    rule: false,
    next: false,
  });
  const [collectLoading, setCollectLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);

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
      executeApi(
        apiRSS.add,
        {
          showMessage: true,
          onBeforeExecute: () =>
            setWindowState((s) => ({ ...s, loading: true })),
          onSuccess() {
            onShowChange(false);
          },
          onFinally: () => setWindowState((s) => ({ ...s, loading: false })),
        },
        rss,
      );
    } else {
      executeApi(
        apiDownload.analysis,
        {
          showMessage: true,
          onBeforeExecute: () =>
            setWindowState((s) => ({ ...s, loading: true })),
          onSuccess(res) {
            if (res) {
              onRuleChange(res);
            }
            setWindowState((s) => ({ ...s, next: true, rule: true }));
          },
          onFinally: () => setWindowState((s) => ({ ...s, loading: false })),
        },
        rss,
      );
    }
  }

  function collect() {
    executeApi(
      apiDownload.collection,
      {
        showMessage: true,
        onBeforeExecute: () => setCollectLoading(true),
        onSuccess() {
          getAll();
          onShowChange(false);
        },
        onFinally: () => setCollectLoading(false),
      },
      rule,
    );
  }

  function subscribe() {
    executeApi(
      apiDownload.subscribe,
      {
        showMessage: true,
        onBeforeExecute: () => setSubscribeLoading(true),
        onSuccess() {
          getAll();
          onShowChange(false);
        },
        onFinally: () => setSubscribeLoading(false),
      },
      rule,
      rss,
    );
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
              loading={windowState.loading}
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
              loading={collectLoading}
              onClick={collect}
            >
              {t('topbar.add.collect')}
            </Button>

            <Button
              variant="brand"
              className="h-10 w-full sm:h-8 sm:w-auto sm:min-w-20"
              loading={subscribeLoading}
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
