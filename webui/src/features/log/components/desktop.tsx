import { useState } from 'react';
import { FileText, ChevronDown, ChevronRight, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { cn } from 'cn';
import { formatLocalTime, getLevelStyle } from './presentation';
import { hasActiveFilters } from '../filters';
import {
  LogClearFilters,
  LogDateFilter,
  LogLevelFilter,
  LogModuleFilter,
  LogQueryFilter,
} from './filter-controls';
import type { LogEntry, LogViewProps } from '../types';

function ExpandableMessage({ entry }: { entry: LogEntry }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-w-0">
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? t('log.collapse') : t('log.expand')}
          className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
        >
          {open ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        <span className="min-w-0 wrap-break-word whitespace-pre-wrap">
          {entry.message}
        </span>
      </div>

      {open && (
        <div className="text-muted-foreground mt-1.5 ml-5 space-y-1 font-mono text-xs">
          <div>
            {entry.module ?? '-'} {t('log.at')} {entry.function}:{entry.line}
          </div>
          {entry.exception && (
            <pre className="bg-muted overflow-x-auto rounded-md p-2 whitespace-pre-wrap">
              {entry.exception}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function LogDesktop({
  entries,
  loaded,
  loading,
  filters,
  setFilters,
  logContainerRef,
  onLogScroll,
  slots,
}: LogViewProps) {
  const { t } = useTranslation();
  const hasFilters = hasActiveFilters(filters);

  return (
    <div className="flex h-full min-h-0 overflow-hidden p-4 md:p-6">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4">
        <Card className="shrink-0 rounded-2xl [--card-spacing:0px]">
          <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <div className="grid min-w-0 grid-cols-[0.7fr_1fr_1fr_1fr] items-center gap-2">
              <LogLevelFilter
                filters={filters}
                setFilters={setFilters}
                className="bg-background w-full min-w-0 text-xs"
              />
              <div className="flex min-w-0 items-center gap-2">
                <Separator
                  orientation="vertical"
                  className="h-8 shrink-0 self-center!"
                />
                <LogDateFilter
                  filters={filters}
                  setFilters={setFilters}
                  className="min-w-0 flex-1"
                />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Separator
                  orientation="vertical"
                  className="h-8 shrink-0 self-center!"
                />
                <LogModuleFilter
                  filters={filters}
                  setFilters={setFilters}
                  className="h-8 min-w-0 flex-1 text-xs"
                />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Separator
                  orientation="vertical"
                  className="h-8 shrink-0 self-center!"
                />
                <LogQueryFilter
                  filters={filters}
                  setFilters={setFilters}
                  className="h-8 min-w-0 flex-1 text-xs"
                />
              </div>
            </div>
            {hasFilters && (
              <LogClearFilters filters={filters} setFilters={setFilters} />
            )}
          </CardContent>
        </Card>

        <div className="min-h-0 flex-1">
          <Card className="flex max-h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl [--card-spacing:0px]">
            <CardContent className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-2 **:data-[slot=table-container]:overflow-visible">
              {slots.loadError ??
                (!loaded ? (
                  <div className="min-h-48" />
                ) : entries.length === 0 ? (
                  <Empty className="min-h-48 border-0 p-6">
                    <EmptyHeader>
                      <EmptyMedia
                        variant="icon"
                        className="bg-brand/10 text-brand"
                      >
                        <FileText />
                      </EmptyMedia>
                      <EmptyTitle>
                        {hasFilters ? t('log.no_matching') : t('log.empty')}
                      </EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div
                    ref={(element) => {
                      logContainerRef.current = element;
                    }}
                    onScroll={onLogScroll}
                    className="ab-log-scrollbar min-h-0 flex-1 overflow-auto overscroll-contain"
                  >
                    <Table className="w-full table-fixed">
                      <TableHeader className="bg-card sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[20%] text-center text-sm font-semibold">
                            {t('log.time')}
                          </TableHead>
                          <TableHead className="w-[12%] text-center text-sm font-semibold">
                            {t('log.level')}
                          </TableHead>
                          <TableHead className="w-[28%] text-center text-sm font-semibold">
                            {t('log.module')}
                          </TableHead>
                          <TableHead className="text-center text-sm font-semibold">
                            {t('log.message')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-muted-foreground min-w-0 font-mono text-xs wrap-break-word break-all whitespace-pre-wrap tabular-nums">
                              {formatLocalTime(entry.timestamp)}
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={cn(
                                  'inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide',
                                  getLevelStyle(entry.level),
                                )}
                              >
                                {entry.level}
                              </span>
                            </TableCell>
                            <TableCell className="min-w-0 wrap-break-word break-all whitespace-pre-wrap text-cyan-700 dark:text-cyan-300">
                              {entry.module ?? '-'}
                            </TableCell>
                            <TableCell className="min-w-0">
                              <ExpandableMessage entry={entry} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {slots.listEnd}
                  </div>
                ))}
              {slots.loadError == null &&
                (!loaded || loading === 'loading') && (
                  <div className="bg-card/70 absolute inset-0 z-20 flex items-center justify-center backdrop-blur-[1px]">
                    <Spinner className="text-brand size-5" />
                  </div>
                )}
              {slots.overlay}
            </CardContent>

            <div className="bg-muted/30 border-border/70 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-t px-5 py-3">
              <span className="text-muted-foreground flex items-center gap-1.5 justify-self-start text-xs">
                <List className="size-3.5" />
                {t('log.loaded_count', { count: String(entries.length) })}
              </span>
              {slots.modeSwitcher}
              <div className="flex flex-wrap items-center gap-1 justify-self-end">
                {slots.footerActions}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
