import { useMemo, useRef, useState } from 'react';
import { List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiLog } from '@/features/log/api';
import { logKeys, logPagesOptions } from '@/features/log/queries';
import { EMPTY_LOG_FILTERS } from '@/features/log/constants';
import type {
  LogEntry,
  LogFilters,
  LogLoadingState,
} from '@/features/log/types';
import { message } from '@/lib/message';
import { copyText } from '@/lib/clipboard';
import { useIsDesktop } from '@/hooks/use-desktop';
import { AbConfirm } from '@/components/shared/ab-confirm';
import { AbLoadError } from '@/components/shared/ab-load-error';
import { LogMobile } from '@/features/log/components/mobile';
import { LogDesktop } from '@/features/log/components/desktop';
import { LogFooterActions } from '@/features/log/components/footer-actions';
import { LogModeSwitch } from '@/features/log/components/mode-switch';
import { LogMobileActionsMenu } from '@/features/log/components/mobile-actions-menu';
import { LogHistoryListEnd } from '@/features/log/components/history-controls';
import {
  LogTailControls,
  LogTailNewEntries,
  LogTailStatusIndicator,
} from '@/features/log/components/tail-controls';
import { useLiveTail } from '@/features/log/use-live-tail';
import { useTailScroll } from '@/features/log/use-tail-scroll';

type LogMode = 'history' | 'tail';

export default function LogPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<LogFilters>(EMPTY_LOG_FILTERS);
  const [mode, setMode] = useState<LogMode>('history');
  const [openResetConfirm, setOpenResetConfirm] = useState(false);
  const isDesktop = useIsDesktop();
  const logContainerRef = useRef<HTMLElement | null>(null);

  const logQuery = useInfiniteQuery({
    ...logPagesOptions(filters),
    enabled: mode === 'history',
  });
  const tail = useLiveTail(filters, mode === 'tail');
  const tailScroll = useTailScroll(
    logContainerRef,
    mode === 'tail',
    tail.entries,
    tail.receivedCount,
    tail.windowId,
  );

  const historyEntries = useMemo(
    () => logQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [logQuery.data],
  );
  const entries = mode === 'history' ? historyEntries : tail.entries;
  const loaded =
    mode === 'history'
      ? logQuery.data !== undefined
      : tail.status !== 'idle' && tail.status !== 'connecting';
  const loading: LogLoadingState =
    mode === 'history'
      ? logQuery.isPending
        ? 'loading'
        : logQuery.isFetching
          ? 'refreshing'
          : 'idle'
      : tail.status === 'connecting'
        ? 'loading'
        : 'idle';

  const resetMutation = useMutation({
    mutationFn: apiLog.clearLog,
    onSuccess: (data) => {
      message.success(t('log.cleared', { count: String(data.deleted_count) }));
      void queryClient.resetQueries({ queryKey: logKeys.all });
      tail.clearAndReconnect();
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

  const historyLoadFailed = mode === 'history' && logQuery.isLoadingError;
  const desktopActions = (
    <LogFooterActions
      compact={false}
      onReset={() => setOpenResetConfirm(true)}
      onCopy={() => void copy()}
    >
      {mode === 'tail' && (
        <>
          <LogTailControls
            status={tail.status}
            compact={false}
            onPause={tail.pause}
            onResume={tail.resume}
            onRetry={tail.retry}
          />
          <LogTailStatusIndicator status={tail.status} />
        </>
      )}
    </LogFooterActions>
  );
  const slots = {
    modeSwitcher: (
      <LogModeSwitch
        value={mode}
        onChange={(nextMode) => setMode(nextMode)}
        fullWidth={!isDesktop}
        compactLabels={!isDesktop}
      />
    ),
    loadedIcon:
      mode === 'tail' ? (
        <LogTailStatusIndicator status={tail.status} />
      ) : (
        <List className="size-3.5" />
      ),
    loadError: historyLoadFailed ? (
      <AbLoadError
        title={t('log.load_failed')}
        retryLabel={t('log.retry')}
        onRetry={() => void logQuery.refetch()}
      />
    ) : null,
    listEnd:
      mode === 'history' ? (
        <LogHistoryListEnd
          hasMore={Boolean(logQuery.hasNextPage)}
          loadingMore={logQuery.isFetchingNextPage}
          loadMoreFailed={logQuery.isFetchNextPageError}
          onLoadMore={() => void logQuery.fetchNextPage()}
          layout={isDesktop ? 'desktop' : 'mobile'}
        />
      ) : null,
    overlay:
      mode === 'tail' ? (
        <LogTailNewEntries
          count={tailScroll.newEntriesCount}
          onClick={tailScroll.scrollToBottom}
        />
      ) : null,
    moreActions: isDesktop ? null : (
      <LogMobileActionsMenu
        onReset={() => setOpenResetConfirm(true)}
        onCopy={() => void copy()}
        tailStatus={mode === 'tail' ? tail.status : undefined}
        onPause={tail.pause}
        onResume={tail.resume}
        onRetry={tail.retry}
      />
    ),
    footerActions: isDesktop ? desktopActions : null,
  };

  return (
    <>
      <div className="h-full min-h-0">
        {isDesktop ? (
          <LogDesktop
            entries={entries}
            loaded={loaded}
            loading={loading}
            filters={filters}
            setFilters={setFilters}
            logContainerRef={logContainerRef}
            onLogScroll={tailScroll.onScroll}
            slots={slots}
          />
        ) : (
          <LogMobile
            entries={entries}
            loaded={loaded}
            loading={loading}
            filters={filters}
            setFilters={setFilters}
            logContainerRef={logContainerRef}
            onLogScroll={tailScroll.onScroll}
            slots={slots}
          />
        )}
      </div>

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
