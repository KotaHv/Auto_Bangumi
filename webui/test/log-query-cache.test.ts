import { describe, expect, test, mock } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';
mock.module('../src/features/log/api', () => ({ apiLog: {} }));

const { logKeys } = await import('../src/features/log/queries');
import type { LogFilters } from '../src/features/log/types';

const defaultFilters: LogFilters = {
  level: null,
  start: null,
  end: null,
  module: '',
  query: '',
};

describe('log query cache reset', () => {
  test('resets cached pages for inactive filter combinations', async () => {
    const queryClient = new QueryClient();
    const otherFilters = { ...defaultFilters, level: 'ERROR' as const };
    queryClient.setQueryData(logKeys.pages(defaultFilters), {
      pages: [{ items: [{ id: 1 }], next_cursor: null }],
      pageParams: [null],
    });
    queryClient.setQueryData(logKeys.pages(otherFilters), {
      pages: [{ items: [{ id: 2 }], next_cursor: null }],
      pageParams: [null],
    });

    await queryClient.resetQueries({ queryKey: logKeys.all });

    expect(
      queryClient.getQueryData(logKeys.pages(defaultFilters)),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(logKeys.pages(otherFilters)),
    ).toBeUndefined();
    queryClient.clear();
  });
});
