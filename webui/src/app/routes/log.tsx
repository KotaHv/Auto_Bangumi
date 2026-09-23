import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiLog } from '@/features/log/api';
import { logKeys, logPagesOptions } from '@/features/log/queries';
import { EMPTY_LOG_FILTERS } from '@/features/log/constants';
import type { LogEntry, LogFilters } from '@/features/log/types';
import { message } from '@/lib/message';
import { copyText } from '@/lib/clipboard';
import { useIsDesktop } from '@/hooks/use-desktop';
import { AbConfirm } from '@/components/shared/ab-confirm';
import { AbLoadError } from '@/components/shared/ab-load-error';
import { LogMobile } from '@/features/log/components/mobile';
import { LogDesktop } from '@/features/log/components/desktop';

export default function LogPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<LogFilters>(EMPTY_LOG_FILTERS);
  const [openResetConfirm, setOpenResetConfirm] = useState(false);
  const isDesktop = useIsDesktop();
  const logContainerRef = useRef<HTMLElement | null>(null);

  const logQuery = useInfiniteQuery(logPagesOptions(filters));

  const entries = useMemo(
    () => logQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [logQuery.data],
  );

  const resetMutation = useMutation({
    mutationFn: apiLog.clearLog,
    onSuccess: (data) => {
      message.success(t('log.cleared', { count: String(data.deleted_count) }));
      void queryClient.resetQueries({ queryKey: logKeys.all });
    },
  });

  function formatEntry(entry: LogEntry) {
    const lines = [`${entry.timestamp} | ${entry.level} | ${entry.message}`];
    lines.push(
      `${entry.module ?? '-'} ${t('log.at')} ${entry.function}:${entry.line}`,
    );
    if (entry.exception) lines.push(entry.exception);
    return lines.join('\n');
  }

  async function copy() {
    const text = entries.map((entry) => formatEntry(entry)).join('\n');
    if (await copyText(text)) {
      message.success(t('notify.copy_success'));
    } else {
      message.error(t('notify.copy_failed'));
    }
  }

  const props = {
    entries,
    loaded: logQuery.data !== undefined,
    loading: logQuery.isPending
      ? ('loading' as const)
      : logQuery.isFetching
        ? ('refreshing' as const)
        : ('idle' as const),
    filters,
    setFilters,
    hasMore: logQuery.hasNextPage,
    loadingMore: logQuery.isFetchingNextPage,
    loadMoreFailed: logQuery.isFetchNextPageError,
    onLoadMore: () => void logQuery.fetchNextPage(),
    logContainerRef,
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
