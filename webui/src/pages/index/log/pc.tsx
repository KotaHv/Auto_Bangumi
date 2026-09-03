import {
  Bug,
  Clipboard,
  FileText,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
  CircleAlert,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AbButton } from '@/components/basic/ab-button';
import { AbSelect } from '@/components/basic/ab-select';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LogLayoutProps, LogLevelFilter, LogLineLimit } from './types';

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

export function LogPc({
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
    { id: 0, value: 'ALL' as const, label: t('log.levels.all') },
    { id: 1, value: 'INFO' as const, label: 'INFO' },
    { id: 2, value: 'WARNING' as const, label: 'WARNING' },
    { id: 3, value: 'ERROR' as const, label: 'ERROR' },
    { id: 4, value: 'DEBUG' as const, label: 'DEBUG' },
  ];
  const lineLimitItems = [
    { id: 5, value: '100', label: '100' },
    { id: 6, value: '500', label: '500' },
    { id: 7, value: '1000', label: '1,000' },
    { id: 8, value: '5000', label: '5,000' },
    { id: 9, value: 'all', label: t('log.lines.all') },
  ];

  return (
    <div className="flex h-full min-h-0 overflow-hidden p-4 md:p-6">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4">
        <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Card className="rounded-2xl [--card-spacing:0px]">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <div className="bg-brand/10 text-brand flex size-9 shrink-0 items-center justify-center rounded-xl">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground flex items-center gap-1.5 truncate text-xs">
                  <span>{t('log.total')}</span>
                  <span
                    className={`size-1.5 rounded-full ${pollingActive ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground/50'}`}
                    title={
                      pollingActive
                        ? t('log.auto_refresh')
                        : t('log.refresh_stopped')
                    }
                  />
                </p>
                <p className="font-display mt-0.5 text-xl font-semibold">
                  {loaded ? log.length : '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl [--card-spacing:0px]">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <div className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-xl">
                <TriangleAlert className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground truncate text-xs">
                  {t('log.errors')}
                </p>
                <p className="font-display mt-0.5 text-xl font-semibold">
                  {loaded ? errorCount : '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl [--card-spacing:0px]">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <CircleAlert className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground truncate text-xs">
                  {t('log.warnings')}
                </p>
                <p className="font-display mt-0.5 text-xl font-semibold">
                  {loaded ? warningCount : '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl [--card-spacing:0px]">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                <Bug className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground truncate text-xs">
                  {t('log.debug')}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold">
                  {loaded
                    ? debugEnable
                      ? t('log.enabled')
                      : t('log.disabled')
                    : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="w-full overflow-hidden rounded-2xl [--card-spacing:0px]">
          <CardContent className="px-4 py-2 **:data-[slot=table-container]:overflow-visible">
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
              <div
                ref={(element) => {
                  logContainerRef.current = element;
                }}
                className="ab-log-scrollbar max-h-[calc(100dvh-16rem)] min-h-32 overflow-auto overscroll-contain"
              >
                <Table className="w-full table-fixed">
                  <TableHeader className="bg-card sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[20%] text-center text-sm font-semibold">
                        {t('log.time')}
                      </TableHead>
                      <TableHead className="w-[10%] text-center text-sm font-semibold">
                        {t('log.level')}
                      </TableHead>
                      {debugEnable && (
                        <TableHead className="w-[25%] text-center text-sm font-semibold">
                          {t('log.module')}
                        </TableHead>
                      )}
                      <TableHead className="text-center text-sm font-semibold">
                        {t('log.message')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {visibleLog.map((item) => (
                      <TableRow key={item.index}>
                        <TableCell className="text-muted-foreground min-w-0 font-mono text-xs wrap-break-word break-all whitespace-pre-wrap tabular-nums">
                          {item.date || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${getTypeStyle(item.type)}`}
                          >
                            {item.type || 'LOG'}
                          </span>
                        </TableCell>
                        {debugEnable && (
                          <TableCell className="min-w-0 pr-4 wrap-break-word break-all whitespace-pre-wrap text-cyan-700 dark:text-cyan-300">
                            {item.module || '-'}
                          </TableCell>
                        )}
                        <TableCell className="min-w-0 wrap-break-word whitespace-pre-wrap">
                          {item.content}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          <div className="bg-muted/30 border-border/70 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {t('log.level')}
              </span>
              <AbSelect
                value={filterLevel}
                items={levelItems}
                size="sm"
                className="bg-background w-32 text-xs"
                onChange={(item) => {
                  const value = typeof item === 'string' ? item : item.value;
                  setFilterLevel(value as LogLevelFilter);
                }}
              />
              <Separator orientation="vertical" className="mx-1 h-5" />
              <span className="text-muted-foreground text-xs">
                {t('log.lines.label')}
              </span>
              <AbSelect
                value={lineLimit === null ? 'all' : String(lineLimit)}
                items={lineLimitItems}
                size="sm"
                className="bg-background w-24 text-xs"
                onChange={(item) => {
                  const value = typeof item === 'string' ? item : item.value;
                  setLineLimit(
                    value === 'all' ? null : (Number(value) as LogLineLimit),
                  );
                }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1">
              <AbButton type="ghost" size="small" onClick={() => getLog()}>
                <RefreshCw className="size-3.5" />
                {t('log.update_now')}
              </AbButton>
              <AbButton type="ghost" size="small" onClick={togglePolling}>
                {pollingActive ? (
                  <Pause className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
                {pollingActive ? t('log.stop_refresh') : t('log.start_refresh')}
              </AbButton>
              <AbButton type="ghost" size="small" onClick={reset}>
                <RotateCcw className="size-3.5" />
                {t('log.reset')}
              </AbButton>
              <AbButton type="ghost" size="small" onClick={copy}>
                <Clipboard className="size-3.5" />
                {t('log.copy')}
              </AbButton>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
