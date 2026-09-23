import { describe, expect, test } from 'bun:test';
import {
  MAX_LOG_LIMIT,
  MAX_TAIL_ENTRIES,
  TAIL_INITIAL_WINDOW,
} from '../src/features/log/constants';
import {
  createLogTailConnection,
  createLogTailUrl,
  LogTailSession,
  type LogTailCallbacks,
  type TailEventSource,
  type TailEventSourceFactory,
} from '../src/features/log/live-tail';
import type { LogEntry, LogFilters } from '../src/features/log/types';

const emptyFilters: LogFilters = {
  level: null,
  start: null,
  end: null,
  module: '',
  query: '',
};

function entry(id: number, message = `line ${id}`): LogEntry {
  return {
    id,
    timestamp: '2026-01-01T12:00:00+00:00',
    level: 'INFO',
    message,
    module: 'module.test',
    function: 'write',
    line: 1,
    exception: null,
  };
}

class FakeEventSource extends EventTarget implements TailEventSource {
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  close() {
    this.closed = true;
  }

  emitOpen() {
    this.dispatchEvent(new Event('open'));
  }

  emitInitial(entries: LogEntry[]) {
    this.dispatchEvent(
      new MessageEvent('initial', { data: JSON.stringify(entries) }),
    );
  }

  emitEntry(value: unknown) {
    this.dispatchEvent(
      new MessageEvent('log', { data: JSON.stringify(value) }),
    );
  }

  emitError() {
    this.onerror?.(new Event('error'));
  }
}

function sourceFactory() {
  const urls: string[] = [];
  const sources: FakeEventSource[] = [];
  const create: TailEventSourceFactory = (url) => {
    urls.push(url);
    const source = new FakeEventSource();
    sources.push(source);
    return source;
  };
  return { create, sources, urls };
}

describe('live tail constants and connection', () => {
  test('declares the backend query limit and initial window', () => {
    expect(MAX_LOG_LIMIT).toBe(500);
    expect(TAIL_INITIAL_WINDOW).toBe(100);
  });

  test('builds a tail URL with the selected filters', () => {
    const url = createLogTailUrl({
      ...emptyFilters,
      level: 'ERROR',
      start: '2026-01-01T00:00:00Z',
      module: 'module.rss',
      query: 'connection lost',
    });

    const parsed = new URL(url, 'http://localhost');
    expect(parsed.pathname).toBe('/api/v1/log/tail');
    expect(parsed.searchParams.get('level')).toBe('ERROR');
    expect(parsed.searchParams.get('start')).toBe('2026-01-01T00:00:00Z');
    expect(parsed.searchParams.get('module')).toBe('module.rss');
    expect(parsed.searchParams.get('query')).toBe('connection lost');
  });

  test('parses initial and incremental events and closes explicitly', () => {
    const { create, sources, urls } = sourceFactory();
    const opened: string[] = [];
    const initial: LogEntry[][] = [];
    const received: LogEntry[] = [];
    const errors: number[] = [];
    const callbacks: LogTailCallbacks = {
      onOpen: () => opened.push('open'),
      onInitial: (items) => initial.push(items),
      onEntry: (item) => received.push(item),
      onError: () => errors.push(1),
    };

    const connection = createLogTailConnection(emptyFilters, callbacks, create);
    const source = sources[0];
    source.emitOpen();
    source.emitInitial([entry(1)]);
    source.emitEntry(entry(2));

    expect(urls).toEqual(['api/v1/log/tail']);
    expect(opened).toEqual(['open']);
    expect(initial[0].map((item) => item.id)).toEqual([1]);
    expect(received.map((item) => item.id)).toEqual([2]);

    connection.close();
    expect(source.closed).toBe(true);
    expect(errors).toEqual([]);
  });

  test('closes on malformed events and errors without automatic reconnect', () => {
    const { create, sources } = sourceFactory();
    let errorCount = 0;
    const callbacks: LogTailCallbacks = {
      onOpen: () => undefined,
      onInitial: () => undefined,
      onEntry: () => undefined,
      onError: () => {
        errorCount += 1;
      },
    };

    createLogTailConnection(emptyFilters, callbacks, create);
    sources[0].emitEntry({ invalid: true });
    sources[0].emitError();

    expect(sources[0].closed).toBe(true);
    expect(errorCount).toBe(1);
    expect(sources).toHaveLength(1);
  });
});

describe('LogTailSession', () => {
  test('closes and reopens on activation, filter changes, pause, resume, and disposal', () => {
    const { create, sources, urls } = sourceFactory();
    const session = new LogTailSession(create);
    session.setFilters(emptyFilters);
    session.setActive(true);
    expect(sources).toHaveLength(1);
    expect(session.getSnapshot().windowId).toBe(1);
    sources[0].emitInitial([entry(1)]);

    session.pause();
    expect(sources[0].closed).toBe(true);
    expect(session.getSnapshot().status).toBe('paused');
    session.setFilters({ ...emptyFilters, level: 'ERROR' });
    expect(sources).toHaveLength(1);

    session.resume();
    expect(sources).toHaveLength(2);
    expect(session.getSnapshot().windowId).toBe(2);
    expect(sources[1].closed).toBe(false);
    expect(urls[1]).toContain('level=ERROR');
    expect(session.getSnapshot().entries).toEqual([]);
    sources[1].emitInitial([entry(2, 'latest window')]);
    expect(session.getSnapshot().entries.map((item) => item.message)).toEqual([
      'latest window',
    ]);

    session.setActive(false);
    expect(sources[1].closed).toBe(true);
    session.setActive(true);
    expect(sources).toHaveLength(3);
    session.dispose();
    expect(sources[2].closed).toBe(true);
  });

  test('requires explicit retry after connection errors', () => {
    const { create, sources } = sourceFactory();
    const session = new LogTailSession(create);
    session.setActive(true);
    sources[0].emitError();

    expect(session.getSnapshot().status).toBe('error');
    expect(sources[0].closed).toBe(true);
    expect(sources).toHaveLength(1);

    session.retry();
    expect(sources).toHaveLength(2);
    expect(session.getSnapshot().status).toBe('connecting');
    session.setActive(false);
    expect(sources[1].closed).toBe(true);
  });

  test('clear empties entries and reconnects; live storage is capped at 1000', () => {
    const { create, sources } = sourceFactory();
    const session = new LogTailSession(create);
    session.setActive(true);
    sources[0].emitInitial([entry(1)]);

    session.clearAndReconnect();
    expect(session.getSnapshot().entries).toEqual([]);
    expect(sources[0].closed).toBe(true);
    expect(sources).toHaveLength(2);

    const recent = Array.from({ length: MAX_TAIL_ENTRIES + 1 }, (_, index) =>
      entry(index + 1),
    );
    sources[1].emitInitial(recent);
    expect(session.getSnapshot().entries).toHaveLength(MAX_TAIL_ENTRIES);
    expect(session.getSnapshot().entries[0].id).toBe(2);
    expect(session.getSnapshot().entries.at(-1)?.id).toBe(MAX_TAIL_ENTRIES + 1);

    sources[1].emitEntry(entry(MAX_TAIL_ENTRIES + 2));
    expect(session.getSnapshot().entries).toHaveLength(MAX_TAIL_ENTRIES);
    expect(session.getSnapshot().entries[0].id).toBe(3);
    session.dispose();
  });
});
