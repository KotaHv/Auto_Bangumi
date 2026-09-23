import { describe, expect, test } from 'bun:test';
import { hasActiveFilters } from '../src/features/log/filters';
import { EMPTY_LOG_FILTERS } from '../src/features/log/constants';

describe('hasActiveFilters', () => {
  test('an untouched filter set is not active', () => {
    expect(hasActiveFilters(EMPTY_LOG_FILTERS)).toBe(false);
  });

  for (const [name, patch] of [
    ['level', { level: 'ERROR' }],
    ['start', { start: '2026-01-01T00:00:00.000Z' }],
    ['end', { end: '2026-01-02T00:00:00.000Z' }],
    ['module', { module: 'rss' }],
    ['query', { query: 'boom' }],
  ] as const) {
    test(`${name} alone counts as active`, () => {
      expect(hasActiveFilters({ ...EMPTY_LOG_FILTERS, ...patch })).toBe(true);
    });
  }

  test('empty strings do not count as active', () => {
    expect(
      hasActiveFilters({ ...EMPTY_LOG_FILTERS, module: '', query: '' }),
    ).toBe(false);
  });
});
