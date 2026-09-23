import { describe, expect, test, mock, beforeEach } from 'bun:test';

const calls: any[] = [];
mock.module('../src/lib/axios', () => ({
  axios: {
    get: async (url: string, config: any) => {
      calls.push({ url, params: config.params });
      return { data: { items: [], next_cursor: null, has_more: false } };
    },
  },
}));

const { apiLog } = await import('../src/features/log/api');
const { PAGE_SIZE } = await import('../src/features/log/constants');

describe('apiLog.getLog', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  test('sends the page size explicitly', async () => {
    await apiLog.getLog(
      { level: null, start: null, end: null, module: '', query: '' },
      null,
    );
    expect(calls[0].params.limit).toBe(PAGE_SIZE);
    expect(PAGE_SIZE).toBe(100);
  });

  test('passes filters and cursor through', async () => {
    await apiLog.getLog(
      { level: 'WARNING', start: 'X', end: null, module: 'rss', query: 'boom' },
      42,
    );
    const p = calls[0].params;
    expect(p.level).toBe('WARNING');
    expect(p.start).toBe('X');
    expect(p.module).toBe('rss');
    expect(p.query).toBe('boom');
    expect(p.before_id).toBe(42);
    expect(p.end).toBeUndefined();
  });

  test('omits empty string filters', async () => {
    await apiLog.getLog(
      { level: null, start: null, end: null, module: '', query: '' },
      null,
    );
    const p = calls[0].params;
    expect(p.module).toBeUndefined();
    expect(p.query).toBeUndefined();
    expect(p.before_id).toBeUndefined();
  });
});
