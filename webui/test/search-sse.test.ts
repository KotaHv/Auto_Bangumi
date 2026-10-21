import { describe, expect, test } from 'bun:test';

import type {
  SearchResult,
  SearchStreamEvent,
} from '../src/features/search/types';
import { makeBangumi, makeRss } from './fixtures';

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
  options: [
    {
      type: 'create',
      bangumi: makeBangumi({ season_raw: null, subtitle: 'Sub', year: null }),
    },
  ],
  rss: makeRss(),
} satisfies SearchResult;

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

    const [result] = stream.events;
    if (result?.type !== 'result') throw new Error('Expected a search result');
    const [option] = result.result.options;
    if (option?.type !== 'create') throw new Error('Expected a create option');
    expect(option.bangumi.filter).toEqual(['1080p']);
    expect(option.bangumi.id).toBeNull();
    expect(option.bangumi.rule_name).toBeNull();
    expect(option.bangumi.save_path).toBeNull();
    expect(result.result.rss.id).toBeNull();
    expect(result.result.rss.name).toBeNull();
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
