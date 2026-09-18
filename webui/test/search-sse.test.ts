import { describe, expect, test } from 'bun:test';

import type { SearchStreamEvent } from '../src/features/search/types';

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  closed = false;
  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  private readonly listeners = new Map<string, (event: Event) => void>();

  constructor() {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.set(type, listener);
  }

  close() {
    this.closed = true;
  }

  emitMessage(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  emit(type: string, data: string) {
    this.listeners.get(type)?.(new MessageEvent(type, { data }));
  }

  emitNativeError() {
    this.onerror?.();
  }
}

Object.defineProperty(globalThis, 'EventSource', {
  configurable: true,
  value: FakeEventSource,
});
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => 'en', setItem: () => undefined },
});

const { apiSearch } = await import('../src/features/search/api');

const searchResultResponse = {
  bangumi: {
    added: false,
    deleted: false,
    dpi: '1080p',
    eps_collect: false,
    filter: '1080p',
    group_name: 'Group',
    id: null,
    official_title: 'Example',
    offset: 0,
    poster_link: null,
    rss_link: 'https://example.com/rss',
    rule_name: null,
    save_path: null,
    season: 1,
    season_raw: null,
    source: null,
    subtitle: 'Sub',
    title_raw: 'Example',
    year: null,
  },
  rss: {
    aggregate: false,
    enabled: true,
    id: null,
    name: null,
    parser: 'mikan',
    url: 'https://example.com/rss',
  },
};

function subscribe() {
  const events: SearchStreamEvent[] = [];
  let completed = false;
  const subscription = apiSearch.get('test').subscribe({
    next: (event) => events.push(event),
    complete: () => {
      completed = true;
    },
  });
  const source = FakeEventSource.instances.at(-1);
  if (!source) throw new Error('EventSource was not created');
  return { events, source, subscription, completed: () => completed };
}

describe('apiSearch.get', () => {
  test('emits valid results then a complete terminal event', () => {
    const stream = subscribe();
    stream.source.emitMessage(JSON.stringify(searchResultResponse));
    stream.source.emit('complete', '');

    expect(stream.events.map(({ type }) => type)).toEqual([
      'result',
      'complete',
    ]);
    expect(stream.completed()).toBe(true);
    expect(stream.source.closed).toBe(true);
  });

  test('maps named server failures to terminal failure events', () => {
    const stream = subscribe();
    stream.source.emit('failure', '{"code":"upstream_unavailable"}');

    expect(stream.events).toEqual([
      { type: 'failure', code: 'upstream_unavailable' },
    ]);
    expect(stream.completed()).toBe(true);
    expect(stream.source.closed).toBe(true);
  });

  test('maps native errors and malformed events to terminal failures', () => {
    const transport = subscribe();
    transport.source.emitNativeError();
    expect(transport.events).toEqual([{ type: 'failure', code: 'transport' }]);

    const protocol = subscribe();
    protocol.source.emitMessage('not json');
    expect(protocol.events).toEqual([{ type: 'failure', code: 'protocol' }]);
  });

  test('closes the EventSource when the request is cancelled', () => {
    const stream = subscribe();
    stream.subscription.unsubscribe();
    expect(stream.source.closed).toBe(true);
  });
});
