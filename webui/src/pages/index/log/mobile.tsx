import {
  CircleAlert,
  Clipboard,
  FileText,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AbSelect } from '@/components/basic/ab-select';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Card, CardContent } from '@/components/ui/card';
import type { LogLayoutProps, LogLine, LogLineLimit } from './types';

function getTypeStyle(type: string) {
  switch (type) {
    case 'ERROR':
      return 'text-destructive bg-destructive/10';
    case 'WARNING':
      return 'text-amber-600 bg-amber-500/10 dark:text-amber-400';
    case 'DEBUG':
      return 'text-muted-foreground bg-muted';
    default:
      return 'text-brand bg-brand/10';
  }
}

const MobileLogRow = memo(function MobileLogRow({
  item,
  debugEnable,
}: {
  item: LogLine;
  debugEnable: boolean;
}) {
  return (
    <Card
      className="border-border rounded-2xl border px-4 py-3 ring-0 [--card-spacing:0px]"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 88px',
      }}
    >
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 font-mono text-sm break-all whitespace-normal tabular-nums">
            {item.date || '-'}
          </span>
          <span
            className={`inline-flex shrink-0 rounded-md px-2 py-1 text-xs font-semibold tracking-wide ${getTypeStyle(item.type)}`}
          >
            {item.type || 'LOG'}
          </span>
        </div>

        {debugEnable && item.module && (
          <div className="mt-2 font-mono text-sm wrap-break-word break-all whitespace-pre-wrap text-cyan-700 dark:text-cyan-300">
            {item.module}
          </div>
        )}

        <div className="mt-2 text-base leading-relaxed wrap-break-word whitespace-pre-wrap">
          {item.content}
        </div>
      </CardContent>
    </Card>
  );
});

export function LogMobile({
  log,
  visibleLog,
  loaded,
  debugEnable,
  filterLevel,
  setFilterLevel,
  lineLimit,
  setLineLimit,
  pollingActive,
  togglePolling,
  logContainerRef,
  getLog,
  reset,
  copy,
}: LogLayoutProps) {
  const { t } = useTranslation();
  const errorCount = log.filter((item) => item.type === 'ERROR').length;
  const warningCount = log.filter((item) => item.type === 'WARNING').length;
  const levelItems = [
    { id: 0, value: 'ALL', label: t('log.levels.all') },
    { id: 1, value: 'INFO', label: 'INFO' },
    { id: 2, value: 'WARNING', label: 'WARNING' },
    { id: 3, value: 'ERROR', label: 'ERROR' },
    { id: 4, value: 'DEBUG', label: 'DEBUG' },
  ];
  const lineLimitItems = [
    { id: 5, value: '100', label: '100' },
    { id: 6, value: '500', label: '500' },
    { id: 7, value: '1000', label: '1,000' },
    { id: 8, value: '5000', label: '5,000' },
    { id: 9, value: 'all', label: t('log.lines.all') },
  ];

  return (
    <div className="mx-4 flex h-full min-h-0 flex-col">
      <Card className="border-border mt-3 shrink-0 rounded-2xl border px-4 py-3 ring-0 [--card-spacing:0px]">
        <CardContent className="text-muted-foreground flex items-center justify-between gap-3">
          <div
            className="text-brand flex items-center gap-1.5"
            title={t('log.total')}
          >
            <FileText className="size-3.5" />
            <span className="font-display text-sm font-semibold tabular-nums">
              {loaded ? log.length : '-'}
            </span>
          </div>
          <div
            className="text-destructive flex items-center gap-1.5"
            title={t('log.errors')}
          >
            <TriangleAlert className="size-3.5" />
            <span className="font-display text-sm font-semibold tabular-nums">
              {loaded ? errorCount : '-'}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400"
            title={t('log.warnings')}
          >
            <CircleAlert className="size-3.5" />
            <span className="font-display text-sm font-semibold tabular-nums">
              {loaded ? warningCount : '-'}
            </span>
          </div>
          <span
            className={`size-1.5 shrink-0 rounded-full ${pollingActive ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground/50'}`}
            title={
              pollingActive ? t('log.auto_refresh') : t('log.refresh_stopped')
            }
          />
        </CardContent>
      </Card>

      <div
        ref={(element) => {
          logContainerRef.current = element;
        }}
        className="no-scrollbar my-3 min-h-0 flex-1 space-y-3 overflow-y-auto"
      >
        {!loaded ? (
          <div className="text-muted-foreground flex min-h-48 items-center justify-center gap-2 text-sm">
            <Spinner className="size-4" />
            {t('log.loading')}
          </div>
        ) : visibleLog.length === 0 ? (
          <Empty className="min-h-64 border-0 p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-brand/10 text-brand">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>
                {log.length === 0 ? t('log.empty') : t('log.no_matching')}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          visibleLog.map((item) => (
            <MobileLogRow
              key={item.index}
              item={item}
              debugEnable={debugEnable}
            />
          ))
        )}
      </div>

      <Card className="border-border bg-popover text-popover-foreground mb-[calc(12px+env(safe-area-inset-bottom))] shrink-0 rounded-2xl border px-4 py-3 shadow-lg ring-0 [--card-spacing:0px]">
        <CardContent className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <AbSelect
              value={filterLevel}
              items={levelItems}
              size="sm"
              className="w-20"
              onChange={(item) => {
                const value = typeof item === 'string' ? item : item.value;
                setFilterLevel(value as typeof filterLevel);
              }}
            />
            <AbSelect
              value={lineLimit === null ? 'all' : String(lineLimit)}
              items={lineLimitItems}
              size="sm"
              className="w-20"
              onChange={(item) => {
                const value = typeof item === 'string' ? item : item.value;
                setLineLimit(
                  value === 'all' ? null : (Number(value) as LogLineLimit),
                );
              }}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('log.update_now')}
              title={t('log.update_now')}
              onClick={() => getLog()}
            >
              <RefreshCw className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                pollingActive ? t('log.stop_refresh') : t('log.start_refresh')
              }
              title={
                pollingActive ? t('log.stop_refresh') : t('log.start_refresh')
              }
              onClick={togglePolling}
            >
              {pollingActive ? (
                <Pause className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('log.reset')}
              title={t('log.reset')}
              onClick={reset}
            >
              <RotateCcw className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('log.copy')}
              title={t('log.copy')}
              onClick={copy}
            >
              <Clipboard className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
