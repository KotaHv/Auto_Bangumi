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
import { AbFloatingBar } from '@/components/basic/ab-floating-bar';
import { AbSelect } from '@/components/basic/ab-select';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
    <Card className="border-border rounded-2xl px-4 py-3 [--card-spacing:0px]">
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground/60 shrink-0 font-mono text-xs font-semibold tabular-nums">
              #{item.index + 1}
            </span>
            <span className="min-w-0 flex-1 font-mono text-sm break-all whitespace-normal tabular-nums">
              {item.date || '-'}
            </span>
          </div>

          <span
            className={cn(
              'inline-flex shrink-0 rounded-md px-2 py-1 text-xs font-semibold tracking-wide',
              getTypeStyle(item.type),
            )}
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
  loading,
  debugEnable,
  filterLevel,
  setFilterLevel,
  lineLimit,
  setLineLimit,
  pollingActive,
  togglePolling,
  logContainerRef,
  getLog,
  onReset,
  copy,
}: LogLayoutProps) {
  const { t } = useTranslation();
  const errorCount = log.filter((item) => item.type === 'ERROR').length;
  const warningCount = log.filter((item) => item.type === 'WARNING').length;
  const levelItems = [
    { value: 'ALL', label: t('log.levels.all') },
    { value: 'INFO', label: 'INFO' },
    { value: 'WARNING', label: 'WARNING' },
    { value: 'ERROR', label: 'ERROR' },
    { value: 'DEBUG', label: 'DEBUG' },
  ];
  const lineLimitItems = [
    { value: '100', label: '100' },
    { value: '500', label: '500' },
    { value: '1000', label: '1,000' },
    { value: '5000', label: '5,000' },
    { value: 'all', label: t('log.lines.all') },
  ];

  return (
    <div className="mx-4 flex h-full min-h-0 flex-col">
      <div className="relative my-3 min-h-0 flex-1">
        <div
          ref={(element) => {
            logContainerRef.current = element;
          }}
          className={cn(
            'no-scrollbar h-full space-y-3 overscroll-none',
            !loaded || loading === 'visible'
              ? 'overflow-hidden'
              : 'overflow-y-auto',
          )}
        >
          {!loaded ? (
            <div className="min-h-48" />
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
        {(!loaded || loading === 'visible') && (
          <div className="bg-card/70 absolute inset-0 z-20 flex touch-none items-center justify-center backdrop-blur-[1px]">
            <Spinner className="text-brand size-5" />
          </div>
        )}
      </div>

      <AbFloatingBar
        position="bottom"
        className="w-full flex-wrap justify-between gap-2"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <AbSelect
            value={filterLevel}
            items={levelItems}
            size="sm"
            triggerClassName="min-w-18"
            onValueChange={(value) => {
              setFilterLevel(value as typeof filterLevel);
            }}
          />
          <AbSelect
            value={lineLimit === null ? 'all' : String(lineLimit)}
            items={lineLimitItems}
            size="sm"
            triggerClassName="min-w-15"
            onValueChange={(value) => {
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
            onClick={onReset}
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
      </AbFloatingBar>
    </div>
  );
}
