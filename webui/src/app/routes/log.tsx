import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiLog } from '@/features/log/api';
import { configOptions } from '@/features/config/queries';
import { logKeys, logOptions } from '@/features/log/queries';
import { message } from '@/lib/message';
import { returnUserLangMsg } from '@/lib/i18n';
import { copyText } from '@/lib/clipboard';
import { useIsDesktop } from '@/hooks/use-desktop';
import { AbConfirm } from '@/components/shared/ab-confirm';
import { AbLoadError } from '@/components/shared/ab-load-error';
import { LogMobile } from '@/features/log/components/mobile';
import { LogDesktop } from '@/features/log/components/desktop';
import { parseLog } from '@/features/log/parse-log';
import type { LogLevelFilter, LogLineLimit } from '@/features/log/types';

export default function LogPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [lineLimit, setLineLimit] = useState<LogLineLimit>(100);
  const [filterLevel, setFilterLevel] = useState<LogLevelFilter>('ALL');
  const [pollingActive, setPollingActive] = useState(true);
  const [openResetConfirm, setOpenResetConfirm] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const logQuery = useQuery({
    ...logOptions(lineLimit),
    refetchInterval: pollingActive ? 10000 : false,
  });
  const { data: config } = useQuery(configOptions());
  const logText = logQuery.data ?? '';
  const deferredLog = useDeferredValue(logText);
  const debugEnable = config?.log.debug_enable ?? false;
  const isDesktop = useIsDesktop();
  const logContainerRef = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const resetMutation = useMutation({
    mutationFn: apiLog.clearLog,
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      queryClient.setQueriesData<string>({ queryKey: logKeys.all }, '');
      void queryClient.invalidateQueries({ queryKey: logKeys.all });
    },
  });

  function backToBottom() {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }

  const formatLog = useMemo(() => parseLog(deferredLog), [deferredLog]);
  const visibleLog = useMemo(
    () =>
      filterLevel === 'ALL'
        ? formatLog
        : formatLog.filter((item) => item.type === filterLevel),
    [filterLevel, formatLog],
  );

  useEffect(() => {
    if (!scrolled && deferredLog) {
      setScrolled(true);
      requestAnimationFrame(backToBottom);
    }
  }, [deferredLog, scrolled]);

  async function getLog(
    requestedLimit = lineLimit,
    showLoading = true,
  ): Promise<void> {
    if (requestedLimit !== lineLimit) {
      setLineLimit(requestedLimit);
    }
    if (showLoading) setManualRefreshing(true);
    try {
      await queryClient.refetchQueries({
        queryKey: logOptions(requestedLimit).queryKey,
        type: 'active',
      });
    } finally {
      if (showLoading) setManualRefreshing(false);
    }
  }

  function changeLineLimit(limit: LogLineLimit) {
    setLineLimit(limit);
    setScrolled(false);
  }

  async function copy() {
    if (await copyText(logText)) {
      message.success(t('notify.copy_success'));
    } else {
      message.error(t('notify.copy_failed'));
    }
  }

  const props = {
    log: formatLog,
    visibleLog,
    loaded: logQuery.data !== undefined,
    loading:
      logQuery.isPending || manualRefreshing
        ? ('visible' as const)
        : logQuery.isFetching
          ? ('silent' as const)
          : (false as const),
    debugEnable,
    filterLevel,
    setFilterLevel,
    lineLimit,
    setLineLimit: changeLineLimit,
    pollingActive,
    togglePolling: () => setPollingActive((active) => !active),
    logContainerRef,
    getLog,
    onReset: () => setOpenResetConfirm(true),
    copy,
  };

  if (logQuery.isLoadingError) {
    return (
      <AbLoadError
        title={t('log.load_failed')}
        retryLabel={t('log.retry')}
        onRetry={() => void logQuery.refetch()}
      />
    );
  }

  return (
    <>
      {isDesktop ? <LogDesktop {...props} /> : <LogMobile {...props} />}
      <AbConfirm
        open={openResetConfirm}
        onOpenChange={setOpenResetConfirm}
        title={t('log.reset')}
        confirmType="warn"
        confirmLoading={resetMutation.isPending}
        onConfirm={async () => {
          await resetMutation.mutateAsync().catch(() => undefined);
          setOpenResetConfirm(false);
        }}
      >
        {t('log.reset_confirm')}
      </AbConfirm>
    </>
  );
}
