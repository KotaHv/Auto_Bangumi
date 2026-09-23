import { useId, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  MoreHorizontal,
} from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { AbFloatingBar } from '@/components/shared/ab-floating-bar';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from 'cn';
import { hasActiveFilters } from '../filters';
import {
  LogClearFiltersIcon,
  LogDateFilter,
  LogLevelFilter,
  LogModuleFilter,
  LogQueryFilter,
} from './filter-controls';
import type { LogEntry, LogViewProps } from '../types';
import { formatLocalTime, getLevelStyle } from './presentation';

const MobileLogRow = memo(function MobileLogRow({
  entry,
}: {
  entry: LogEntry;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-border rounded-2xl px-4 py-3 [--card-spacing:0px]">
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground/60 shrink-0 font-mono text-xs font-semibold tabular-nums">
              #{entry.id}
            </span>
            <span className="min-w-0 flex-1 font-mono text-sm break-all whitespace-normal tabular-nums">
              {formatLocalTime(entry.timestamp)}
            </span>
          </div>

          <span
            className={cn(
              'inline-flex shrink-0 rounded-md px-2 py-1 text-xs font-semibold tracking-wide',
              getLevelStyle(entry.level),
            )}
          >
            {entry.level}
          </span>
        </div>

        <div className="text-muted-foreground mt-2 flex min-w-0 gap-1 text-xs">
          <span className="shrink-0">{t('log.module')}:</span>
          <span className="min-w-0 font-mono break-all">
            {entry.module ?? '-'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? t('log.collapse') : t('log.expand')}
          className="mt-2 flex w-full items-start gap-1.5 text-left"
        >
          <span className="text-muted-foreground hover:text-foreground mt-1 flex size-5 shrink-0 items-center justify-center">
            {open ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </span>
          <span className="min-w-0 flex-1 text-base leading-relaxed wrap-break-word whitespace-pre-wrap">
            {entry.message}
          </span>
        </button>

        {open && (
          <div className="text-muted-foreground mt-1 space-y-1 font-mono text-xs">
            <div>
              {t('log.at')} {entry.function}:{entry.line}
            </div>
            {entry.exception && (
              <pre className="bg-muted overflow-x-auto rounded-md p-2 whitespace-pre-wrap">
                {entry.exception}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export function LogMobile({
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
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const moreFiltersId = useId();
  const hasFilters = hasActiveFilters(filters);

  return (
    <div className="mx-4 flex h-full min-h-0 flex-col">
      <AbFloatingBar position="top" className="w-full shadow-none">
        <CardContent className="flex w-full flex-col gap-2 py-2">
          <div className="flex items-center gap-1.5">
            <LogLevelFilter
              filters={filters}
              setFilters={setFilters}
              className="min-w-20 flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              aria-label={t(
                moreFiltersOpen ? 'log.less_filters' : 'log.more_filters',
              )}
              title={t(
                moreFiltersOpen ? 'log.less_filters' : 'log.more_filters',
              )}
              aria-expanded={moreFiltersOpen}
              aria-controls={moreFiltersId}
              onClick={() => setMoreFiltersOpen((open) => !open)}
            >
              {moreFiltersOpen ? <ChevronUp /> : <MoreHorizontal />}
            </Button>
            <LogClearFiltersIcon filters={filters} setFilters={setFilters} />
          </div>

          {moreFiltersOpen && (
            <div id={moreFiltersId} className="flex flex-col gap-2">
              <LogModuleFilter
                filters={filters}
                setFilters={setFilters}
                className="h-8 w-full text-xs"
              />
              <LogQueryFilter
                filters={filters}
                setFilters={setFilters}
                className="h-8 w-full text-xs"
              />
              <LogDateFilter
                filters={filters}
                setFilters={setFilters}
                className="w-full"
              />
            </div>
          )}
        </CardContent>
      </AbFloatingBar>

      <div className="relative my-3 min-h-0 flex-1">
        <div
          ref={(element) => {
            logContainerRef.current = element;
          }}
          onScroll={onLogScroll}
          className={cn(
            'no-scrollbar h-full space-y-3 overscroll-none',
            !loaded || loading === 'loading'
              ? 'overflow-hidden'
              : 'overflow-y-auto',
          )}
        >
          {slots.loadError ??
            (!loaded ? (
              <div className="min-h-48" />
            ) : entries.length === 0 ? (
              <Empty className="h-full min-h-0 border-0 p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-brand/10 text-brand">
                    <FileText />
                  </EmptyMedia>
                  <EmptyTitle>
                    {hasFilters ? t('log.no_matching') : t('log.empty')}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                {entries.map((entry) => (
                  <MobileLogRow key={entry.id} entry={entry} />
                ))}
                {slots.listEnd}
              </>
            ))}
        </div>
        {slots.loadError == null && (!loaded || loading === 'loading') && (
          <div className="bg-card/70 absolute inset-0 z-20 flex touch-none items-center justify-center backdrop-blur-[1px]">
            <Spinner className="text-brand size-5" />
          </div>
        )}
        {slots.overlay}
      </div>

      <AbFloatingBar position="bottom" className="w-full">
        <div className="flex w-full items-center gap-2">
          <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
            {slots.loadedIcon}
            {t('log.loaded_count', { count: String(entries.length) })}
          </span>
          {slots.modeSwitcher}
          {slots.moreActions}
        </div>
      </AbFloatingBar>
    </div>
  );
}
