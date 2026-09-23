import { describe, expect, test } from 'bun:test';
import {
  applyDateRange,
  filtersToDateRange,
  formatDateRangeLabel,
  localDateToUtcEnd,
  localDateToUtcStart,
  utcEndBoundToDisplayDate,
  utcToLocalDate,
} from '../src/features/log/time';

describe('localDateToUtcStart', () => {
  test('covers local midnight of the picked day', () => {
    const result = utcToLocalDate(localDateToUtcStart(new Date(2026, 0, 1)))!;

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  test('emits a UTC ISO string', () => {
    expect(localDateToUtcStart(new Date(2026, 0, 1))).toMatch(/Z$/);
  });
});

describe('localDateToUtcEnd', () => {
  test('ends at midnight of the following day (exclusive bound)', () => {
    const result = utcToLocalDate(localDateToUtcEnd(new Date(2026, 0, 1)))!;

    expect(result.getDate()).toBe(2);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  test('start and end of the same day are ordered', () => {
    const day = new Date(2026, 5, 15);
    expect(new Date(localDateToUtcStart(day)).getTime()).toBeLessThan(
      new Date(localDateToUtcEnd(day)).getTime(),
    );
  });

  test('a one day range covers noon and ends exactly at next midnight', () => {
    const day = new Date(2026, 0, 1);
    const noon = new Date(2026, 0, 1, 12, 0, 0).getTime();
    const nextMidnight = new Date(2026, 0, 2, 0, 0, 0).getTime();

    expect(new Date(localDateToUtcStart(day)).getTime()).toBeLessThan(noon);
    expect(new Date(localDateToUtcEnd(day)).getTime()).toBeGreaterThan(noon);
    expect(new Date(localDateToUtcEnd(day)).getTime()).toBe(nextMidnight);
  });

  test('handles a month boundary', () => {
    const result = utcToLocalDate(localDateToUtcEnd(new Date(2026, 0, 31)))!;

    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(1);
  });
});

describe('utcToLocalDate', () => {
  test('round trips a date through UTC', () => {
    const day = new Date(2026, 2, 9);
    const back = utcToLocalDate(localDateToUtcStart(day))!;

    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(2);
    expect(back.getDate()).toBe(9);
  });

  test('invalid timestamps yield null', () => {
    expect(utcToLocalDate('nonsense')).toBeNull();
  });
});

describe('formatDateRangeLabel', () => {
  test('renders both ends when a full range is picked', () => {
    expect(
      formatDateRangeLabel(new Date(2026, 0, 1), new Date(2026, 0, 5)),
    ).toBe('2026/01/01 - 2026/01/05');
  });

  test('renders a single day when only one end is picked', () => {
    expect(formatDateRangeLabel(new Date(2026, 0, 1), undefined)).toBe(
      '2026/01/01',
    );
  });

  test('renders nothing without a selection', () => {
    expect(formatDateRangeLabel(undefined, undefined)).toBeNull();
  });
});

describe('utcEndBoundToDisplayDate', () => {
  test('steps back one day so the stored exclusive bound shows the picked day', () => {
    const picked = new Date(2026, 0, 5);
    const bound = localDateToUtcEnd(picked);

    const display = utcEndBoundToDisplayDate(bound)!;

    expect(display.getFullYear()).toBe(2026);
    expect(display.getMonth()).toBe(0);
    expect(display.getDate()).toBe(5);
  });

  test('invalid timestamp yields null', () => {
    expect(utcEndBoundToDisplayDate('nonsense')).toBeNull();
  });
});

describe('date range round trip through the query bounds', () => {
  test('a multi day selection displays the days the user picked', () => {
    const from = new Date(2026, 0, 1);
    const to = new Date(2026, 0, 5);

    const displayFrom = utcToLocalDate(localDateToUtcStart(from))!;
    const displayTo = utcEndBoundToDisplayDate(localDateToUtcEnd(to))!;

    expect(formatDateRangeLabel(displayFrom, displayTo)).toBe(
      '2026/01/01 - 2026/01/05',
    );
  });

  test('a single day selection displays exactly one day', () => {
    const day = new Date(2026, 0, 1);

    const displayFrom = utcToLocalDate(localDateToUtcStart(day))!;
    const displayTo = utcEndBoundToDisplayDate(localDateToUtcEnd(day))!;

    expect(formatDateRangeLabel(displayFrom, displayTo)).toBe('2026/01/01');
    expect(displayFrom.getTime()).toBe(displayTo.getTime());
  });
});

describe('formatDateRangeLabel with equal ends', () => {
  test('collapses a same day range to a single date', () => {
    const day = new Date(2026, 0, 1);
    expect(formatDateRangeLabel(day, day)).toBe('2026/01/01');
  });
});

describe('applyDateRange', () => {
  const base = {
    level: null,
    start: null,
    end: null,
    module: '',
    query: '',
  };

  test('clears both bounds when the selection is cleared', () => {
    const filters = { ...base, start: 'X', end: 'Y' };

    expect(applyDateRange(filters, undefined)).toMatchObject({
      start: null,
      end: null,
    });
  });

  test('a full range stores start and the exclusive end', () => {
    const result = applyDateRange(base, {
      from: new Date(2026, 0, 1),
      to: new Date(2026, 0, 5),
    });

    expect(result.start).toBe(localDateToUtcStart(new Date(2026, 0, 1)));
    expect(result.end).toBe(localDateToUtcEnd(new Date(2026, 0, 5)));
  });

  test('a single picked day means that whole day', () => {
    const day = new Date(2026, 0, 1);

    const result = applyDateRange(base, { from: day, to: undefined });

    expect(result.start).toBe(localDateToUtcStart(day));
    expect(result.end).toBe(localDateToUtcEnd(day));
  });

  test('preserves the other filters', () => {
    const filters = { ...base, level: 'ERROR', module: 'rss' };

    const result = applyDateRange(filters, { from: new Date(2026, 0, 1) });

    expect(result.level).toBe('ERROR');
    expect(result.module).toBe('rss');
  });
});

describe('filtersToDateRange', () => {
  const base = {
    level: null,
    start: null,
    end: null,
    module: '',
    query: '',
  };

  test('returns undefined when no date filter is set', () => {
    expect(filtersToDateRange(base)).toBeUndefined();
  });

  test('round trips a stored range back to the picked days', () => {
    const stored = applyDateRange(base, {
      from: new Date(2026, 0, 1),
      to: new Date(2026, 0, 5),
    });

    const range = filtersToDateRange(stored)!;

    expect(range.from!.getDate()).toBe(1);
    expect(range.to!.getDate()).toBe(5);
  });

  test('a single stored day shows as a one day range', () => {
    const stored = applyDateRange(base, { from: new Date(2026, 0, 1) });

    const range = filtersToDateRange(stored)!;

    expect(range.from!.getTime()).toBe(range.to!.getTime());
    expect(formatDateRangeLabel(range.from, range.to)).toBe('2026/01/01');
  });
});
