import type { DateRange } from 'react-day-picker';

import type { LogFilters } from './types';

export function localDateToUtcStart(date: Date): string {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  ).toISOString();
}

export function localDateToUtcEnd(date: Date): string {
  // The backend treats `end` as an exclusive bound, so the range ends at
  // midnight of the following day; no last-millisecond arithmetic needed.
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0,
    0,
    0,
    0,
  ).toISOString();
}

export function utcToLocalDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The stored `end` is an exclusive upper bound (midnight of the day *after*
 * the last selected day), so turning it back into a date for display requires
 * stepping back one day.
 */
export function utcEndBoundToDisplayDate(value: string): Date | null {
  const date = utcToLocalDate(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

export function formatDateRangeLabel(
  from: Date | undefined,
  to: Date | undefined,
) {
  if (!from && !to) return null;
  const format = (date: Date) =>
    `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

  const start = (from ?? to) as Date;
  const end = (to ?? from) as Date;
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  return sameDay ? format(start) : `${format(start)} - ${format(end)}`;
}

/** Project stored filters into the dates the calendar should display. */
export function filtersToDateRange(filters: LogFilters): DateRange | undefined {
  const from = filters.start ? utcToLocalDate(filters.start) : null;
  const to = filters.end ? utcEndBoundToDisplayDate(filters.end) : null;
  if (!from && !to) return undefined;
  return { from: from ?? undefined, to: to ?? undefined };
}

/**
 * Turn a calendar selection into stored filters. A single picked day means
 * "that whole day", so `end` falls back to `from` before being expanded to
 * the next midnight by localDateToUtcEnd.
 */
export function applyDateRange(
  filters: LogFilters,
  range: DateRange | undefined,
): LogFilters {
  const from = range?.from ?? null;
  const to = range?.to ?? range?.from ?? null;
  return {
    ...filters,
    start: from ? localDateToUtcStart(from) : null,
    end: to ? localDateToUtcEnd(to) : null,
  };
}
