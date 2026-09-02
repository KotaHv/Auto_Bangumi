import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiDownload } from '@/api/download';
import { apiRSS } from '@/api/rss';
import { message } from '@/components/message';
import { executeApi } from '@/hooks/use-api';
import { useBangumiStore } from '@/store/bangumi';
import { rssTemplate } from '#/rss';
import type { BangumiRule } from '#/bangumi';
import type { RSS } from '#/rss';
import { AbButton } from './basic/ab-button';
import { AbPopup } from './ab-popup';
import { AbRule } from './ab-rule';
import { AbSetting } from './ab-setting';
import { Separator } from '@/components/ui/separator';

const PARSER_TYPE = ['mikan', 'tmdb', 'parser'];

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
            <AbSetting
              label={t('topbar.add.rss_link')}
              type="input"
              value={rss.url}
              onChange={(url) => setRss((s) => ({ ...s, url }))}
              prop={{ placeholder: t('topbar.add.placeholder_link') }}
              css="h-10 sm:w-full"
            />

            <AbSetting
              label={t('topbar.add.name')}
              type="input"
              value={rss.name}
              onChange={(name) => setRss((s) => ({ ...s, name }))}
              prop={{ placeholder: t('topbar.add.placeholder_name') }}
              css="h-10 sm:w-full"
            />

            <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
              <div className="sm:justify-self-start">
                <AbSetting
                  label={t('topbar.add.aggregate')}
                  type="switch"
                  orientation="horizontal"
                  compact
                  value={rss.aggregate}
                  onChange={(aggregate) => setRss((s) => ({ ...s, aggregate }))}
                  prop={{ size: 'lg' }}
                />
              </div>

              <div className="sm:justify-self-end">
                <AbSetting
                  label={t('topbar.add.parser')}
                  type="select"
                  orientation="horizontal"
                  compact
                  value={rss.parser}
                  onChange={(parser) => setRss((s) => ({ ...s, parser }))}
                  prop={{ items: PARSER_TYPE }}
                  css="w-24 sm:w-24"
                />
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-end">
            <AbButton
              size="normal"
              type="brand"
              className="h-10 w-full sm:h-8 sm:w-auto sm:min-w-20"
              loading={windowState.loading}
              onClick={addRss}
            >
              {t('topbar.add.button')}
            </AbButton>
          </div>
        </div>
      ) : (
        <div>
          <AbRule rule={rule} onChange={onRuleChange} />

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <AbButton
              size="normal"
              type="outline"
              className="h-10 w-full sm:h-8 sm:w-auto sm:min-w-20"
              loading={collectLoading}
              onClick={collect}
            >
              {t('topbar.add.collect')}
            </AbButton>

            <AbButton
              size="normal"
              type="brand"
              className="h-10 w-full sm:h-8 sm:w-auto sm:min-w-20"
              loading={subscribeLoading}
              onClick={subscribe}
            >
              {t('topbar.add.subscribe')}
            </AbButton>
          </div>
        </div>
      )}
    </AbPopup>
  );
}
