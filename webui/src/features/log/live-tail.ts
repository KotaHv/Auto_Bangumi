import type { LogFilters, LogEntry } from './types';
import { MAX_TAIL_ENTRIES } from './constants';

export type LogTailStatus =
  'idle' | 'connecting' | 'connected' | 'paused' | 'error';

export interface LogTailSnapshot {
  entries: LogEntry[];
  status: LogTailStatus;
  receivedCount: number;
  windowId: number;
}

export interface TailEventSource {
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject,
  ): void;
  onerror: ((event: Event) => void) | null;
  close(): void;
}

export type TailEventSourceFactory = (url: string) => TailEventSource;

export interface LogTailCallbacks {
  onOpen: () => void;
  onInitial: (entries: LogEntry[]) => void;
  onEntry: (entry: LogEntry) => void;
  onError: () => void;
}

export interface LogTailConnection {
  close: () => void;
}

const defaultEventSourceFactory: TailEventSourceFactory = (url) =>
  new EventSource(url, { withCredentials: true });

export function createLogTailUrl(filters: LogFilters) {
  const params = new URLSearchParams();
  if (filters.level) params.set('level', filters.level);
  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  if (filters.module) params.set('module', filters.module);
  if (filters.query) params.set('query', filters.query);
  const query = params.toString();
  return `api/v1/log/tail${query ? `?${query}` : ''}`;
}

function parseLogEntryValue(parsed: unknown): LogEntry | null {
  if (typeof parsed !== 'object' || parsed === null) return null;
  const entry = parsed as Record<string, unknown>;
  if (
    !Number.isSafeInteger(entry.id) ||
    typeof entry.timestamp !== 'string' ||
    typeof entry.level !== 'string' ||
    typeof entry.message !== 'string' ||
    !(typeof entry.module === 'string' || entry.module === null) ||
    typeof entry.function !== 'string' ||
    !Number.isInteger(entry.line) ||
    !(typeof entry.exception === 'string' || entry.exception === null)
  ) {
    return null;
  }

  return entry as unknown as LogEntry;
}

function parseLogEntry(data: string): LogEntry | null {
  try {
    return parseLogEntryValue(JSON.parse(data));
  } catch {
    return null;
  }
}

function eventData(event: Event): string | null {
  if (!('data' in event) || typeof event.data !== 'string') return null;
  return event.data;
}

export function createLogTailConnection(
  filters: LogFilters,
  callbacks: LogTailCallbacks,
  createSource: TailEventSourceFactory = defaultEventSourceFactory,
): LogTailConnection {
  const source = createSource(createLogTailUrl(filters));
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    source.close();
  }

  function fail() {
    if (closed) return;
    close();
    callbacks.onError();
  }

  source.addEventListener('open', () => {
    if (!closed) callbacks.onOpen();
  });
  source.addEventListener('initial', (event) => {
    if (closed) return;
    const data = eventData(event);
    if (data === null) return fail();
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return fail();
    }
    if (!Array.isArray(parsed)) return fail();
    const entries = parsed.map(parseLogEntryValue);
    if (entries.some((entry) => entry === null)) return fail();
    callbacks.onInitial(entries as LogEntry[]);
  });
  source.addEventListener('log', (event) => {
    if (closed) return;
    const data = eventData(event);
    const entry = data === null ? null : parseLogEntry(data);
    if (entry === null) return fail();
    callbacks.onEntry(entry);
  });
  source.onerror = fail;

  return { close };
}

function appendEntry(entries: LogEntry[], entry: LogEntry): LogEntry[] {
  const withoutDuplicate = entries.filter(
    (existing) => existing.id !== entry.id,
  );
  return [...withoutDuplicate, entry].slice(-MAX_TAIL_ENTRIES);
}

function sameFilters(left: LogFilters, right: LogFilters) {
  return (
    left.level === right.level &&
    left.start === right.start &&
    left.end === right.end &&
    left.module === right.module &&
    left.query === right.query
  );
}

export class LogTailSession {
  private readonly listeners = new Set<() => void>();
  private connection: LogTailConnection | null = null;
  private generation = 0;
  private active = false;
  private paused = false;
  private filters: LogFilters = {
    level: null,
    start: null,
    end: null,
    module: '',
    query: '',
  };
  private snapshot: LogTailSnapshot = {
    entries: [],
    status: 'idle',
    receivedCount: 0,
    windowId: 0,
  };

  constructor(
    private readonly createSource: TailEventSourceFactory = defaultEventSourceFactory,
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  setFilters(filters: LogFilters) {
    if (sameFilters(this.filters, filters)) return;
    this.filters = { ...filters };
    if (this.active && !this.paused) {
      this.connect();
    } else {
      this.update({ entries: [], status: this.paused ? 'paused' : 'idle' });
    }
  }

  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    if (!active) {
      this.closeConnection();
      this.update({ status: this.paused ? 'paused' : 'idle' });
    } else if (!this.paused) {
      this.connect();
    }
  }

  pause() {
    if (!this.active || this.paused) return;
    this.paused = true;
    this.closeConnection();
    this.update({ status: 'paused' });
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.active) {
      this.connect();
    } else {
      this.update({ status: 'idle' });
    }
  }

  retry() {
    if (!this.active || this.paused || this.snapshot.status !== 'error') return;
    this.connect();
  }

  clearAndReconnect() {
    this.paused = false;
    this.update({ entries: [], receivedCount: 0 });
    if (this.active) {
      this.connect();
    } else {
      this.update({ status: 'idle' });
    }
  }

  dispose() {
    this.active = false;
    this.closeConnection();
    this.listeners.clear();
  }

  private connect() {
    this.closeConnection();
    const generation = this.generation;
    this.update({
      entries: [],
      status: 'connecting',
      receivedCount: 0,
      windowId: this.snapshot.windowId + 1,
    });
    this.connection = createLogTailConnection(
      this.filters,
      {
        onOpen: () => {
          if (generation === this.generation) {
            this.update({ status: 'connected' });
          }
        },
        onInitial: (entries) => {
          if (generation === this.generation) {
            this.update({
              entries: entries.slice(-MAX_TAIL_ENTRIES),
              status: 'connected',
            });
          }
        },
        onEntry: (entry) => {
          if (generation === this.generation) {
            this.update({
              entries: appendEntry(this.snapshot.entries, entry),
              status: 'connected',
              receivedCount: this.snapshot.receivedCount + 1,
            });
          }
        },
        onError: () => {
          if (generation !== this.generation) return;
          this.connection = null;
          this.update({ status: 'error' });
        },
      },
      this.createSource,
    );
  }

  private closeConnection() {
    this.generation += 1;
    this.connection?.close();
    this.connection = null;
  }

  private update(update: Partial<LogTailSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    for (const listener of this.listeners) listener();
  }
}
