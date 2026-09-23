import { describe, expect, test } from 'bun:test';
import { InfiniteQueryObserver, QueryClient } from '@tanstack/query-core';
import { EMPTY_LOG_FILTERS } from '../src/features/log/constants';
import type { LogEntry, LogPage } from '../src/features/log/types';

function entry(id: number): LogEntry {
  return {
    id,
    timestamp: '2026-01-01T00:00:00+00:00',
    level: 'INFO',
    message: `line ${id}`,
    module: 'module.test',
    function: 'function',
    line: 1,
    exception: null,
  };
}

function pageFor(items: LogEntry[], nextCursor: number | null): LogPage {
  return { items, next_cursor: nextCursor, has_more: nextCursor !== null };
}

function observe(queryFn: (cursor: number | null) => Promise<LogPage>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return new InfiniteQueryObserver(client, {
    queryKey: ['log', 'pages', EMPTY_LOG_FILTERS],
    queryFn: ({ pageParam }) => queryFn(pageParam as number | null),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage: LogPage) => lastPage.next_cursor,
  });
}

async function firstPage(
  observer: InfiniteQueryObserver<any, any, any, any, any>,
) {
  return new Promise<any>((resolve) => {
    const unsubscribe = observer.subscribe((state: any) => {
      if (state.isPending) return;
      unsubscribe();
      resolve(state);
    });
  });
}

async function afterNextPage(
  observer: InfiniteQueryObserver<any, any, any, any, any>,
) {
  return new Promise<any>((resolve) => {
    let settled = false;
    const finish = (state: any) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(state);
    };
    const unsubscribe = observer.subscribe((state: any) => {
      // Wait until the next-page fetch has actually started and then stopped.
      if (state.isFetchingNextPage) hasStarted = true;
      if (hasStarted && !state.isFetchingNextPage) finish(state);
    });
    let hasStarted = false;
    setTimeout(() => finish(observer.getCurrentResult()), 2000);
    void observer.fetchNextPage();
  });
}

describe('log pagination failure', () => {
  test('a failed next page exposes isFetchNextPageError and keeps loaded entries', async () => {
    const observer = observe(async (cursor) => {
      if (cursor === null) return pageFor([entry(2), entry(1)], 1);
      throw new Error('next page failed');
    });

    await firstPage(observer);
    const state = await afterNextPage(observer);

    expect(state.isFetchNextPageError).toBe(true);
    expect(state.data.pages).toHaveLength(1);
    expect(state.data.pages[0].items.map((item: LogEntry) => item.id)).toEqual([
      2, 1,
    ]);
  });

  test('a failed next page is not reported as a first load error', async () => {
    const observer = observe(async (cursor) => {
      if (cursor === null) return pageFor([entry(1)], 1);
      throw new Error('next page failed');
    });

    await firstPage(observer);
    const state = await afterNextPage(observer);

    // This is the root cause of the silent failure: the list view only
    // rendered an error for isLoadingError, which never fires here.
    expect(state.isLoadingError).toBe(false);
  });

  test('a successful next page appends entries and clears the error', async () => {
    const observer = observe(async (cursor) => {
      if (cursor === null) return pageFor([entry(2)], 1);
      return pageFor([entry(1)], null);
    });

    await firstPage(observer);
    const state = await afterNextPage(observer);

    expect(state.isFetchNextPageError).toBe(false);
    expect(
      state.data.pages
        .flatMap((p: LogPage) => p.items)
        .map((item: LogEntry) => item.id),
    ).toEqual([2, 1]);
    expect(state.hasNextPage).toBe(false);
  });
});
