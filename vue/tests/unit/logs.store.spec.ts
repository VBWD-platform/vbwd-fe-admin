import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLogsStore } from '@/stores/logs';
import { api } from '@/api';
import { downloadBlob } from 'vbwd-view-component';
import type { LogRecord } from '@/stores/logs';

// S106.3 — the centralized-log Logs store reuses the `api` singleton (no bespoke
// service), mirroring webhooks.ts / llmConnections.ts. Backend contract:
//   GET /admin/logs/scopes  -> { scopes: [...], streams: [...] }
//   GET /admin/logs         -> { records, next_cursor, truncated, ... }
//   GET /admin/logs/download (blob via fetch) and a polling-based live tail.
vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getToken: vi.fn().mockReturnValue('admin-test-token'),
    baseURL: '/api/v1',
  },
}));

vi.mock('vbwd-view-component', () => ({
  downloadBlob: vi.fn(),
}));

function makeRecord(overrides: Partial<LogRecord>): LogRecord {
  return {
    ts: 1_700_000_000,
    level: 'error',
    scope: 'core',
    stream: 'error',
    logger: 'vbwd.core',
    msg: 'something failed',
    ...overrides,
  };
}

const SCOPES_RESPONSE = {
  scopes: ['core', 'bot_telegram', 'shop'],
  streams: ['error', 'warnings', 'info', 'events'],
};

describe('useLogsStore (S106.3)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetchScopes() GETs /admin/logs/scopes and stores scopes + streams', async () => {
    vi.mocked(api.get).mockResolvedValue(SCOPES_RESPONSE);
    const store = useLogsStore();

    await store.fetchScopes();

    expect(api.get).toHaveBeenCalledWith('/admin/logs/scopes');
    expect(store.availableScopes).toEqual(['core', 'bot_telegram', 'shop']);
    expect(store.availableStreams).toEqual(['error', 'warnings', 'info', 'events']);
  });

  it('query() serializes multiple scopes/streams comma-separated and maps filters', async () => {
    vi.mocked(api.get).mockResolvedValue({
      records: [makeRecord({ ts: 200 }), makeRecord({ ts: 100 })],
      next_cursor: 'cursor-abc',
      truncated: true,
      bytes_scanned: 4096,
      segments_scanned: 2,
      malformed_skipped: 1,
    });
    const store = useLogsStore();
    store.filters.scopes = ['core', 'shop'];
    store.filters.streams = ['error', 'warnings'];
    store.filters.level = 'warning';
    store.filters.minutes = 60;
    store.filters.contains = 'failed';
    store.filters.limit = 200;

    await store.query();

    expect(api.get).toHaveBeenCalledWith('/admin/logs', {
      params: {
        scope: 'core,shop',
        stream: 'error,warnings',
        level: 'warning',
        minutes: 60,
        contains: 'failed',
        limit: 200,
      },
    });
    expect(store.records).toHaveLength(2);
    expect(store.nextCursor).toBe('cursor-abc');
    expect(store.truncated).toBe(true);
    expect(store.bytesScanned).toBe(4096);
    expect(store.segmentsScanned).toBe(2);
    expect(store.malformedSkipped).toBe(1);
  });

  it('query() omits empty filters and uses `since=0` when window is "all"', async () => {
    vi.mocked(api.get).mockResolvedValue({ records: [], next_cursor: null, truncated: false });
    const store = useLogsStore();
    store.filters.scopes = [];
    store.filters.streams = [];
    store.filters.level = '';
    store.filters.minutes = null;
    store.filters.allHistory = true;
    store.filters.contains = '';
    store.filters.limit = 500;

    await store.query();

    expect(api.get).toHaveBeenCalledWith('/admin/logs', {
      params: {
        since: 0,
        limit: 500,
      },
    });
  });

  it('loadMore() passes the stored next_cursor and appends results', async () => {
    const store = useLogsStore();
    store.records = [makeRecord({ ts: 300 })];
    store.nextCursor = 'cursor-1';
    store.filters.scopes = ['core'];
    store.filters.minutes = null;
    store.filters.limit = 100;
    vi.mocked(api.get).mockResolvedValue({
      records: [makeRecord({ ts: 200 }), makeRecord({ ts: 100 })],
      next_cursor: 'cursor-2',
      truncated: false,
    });

    await store.loadMore();

    expect(api.get).toHaveBeenCalledWith('/admin/logs', {
      params: {
        scope: 'core',
        limit: 100,
        cursor: 'cursor-1',
      },
    });
    expect(store.records.map((record) => record.ts)).toEqual([300, 200, 100]);
    expect(store.nextCursor).toBe('cursor-2');
  });

  it('loadMore() is a no-op when there is no cursor', async () => {
    const store = useLogsStore();
    store.nextCursor = null;

    await store.loadMore();

    expect(api.get).not.toHaveBeenCalled();
  });

  it('query() surfaces a backend error into store.error', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Forbidden'));
    const store = useLogsStore();

    await expect(store.query()).rejects.toThrow('Forbidden');
    expect(store.error).toBe('Forbidden');
    expect(store.loading).toBe(false);
  });

  it('download() fetches an ndjson blob (auth header) and triggers a browser download', async () => {
    const blob = new Blob(['{}'], { type: 'application/x-ndjson' });
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(blob) });
    vi.stubGlobal('fetch', fetchSpy);

    const store = useLogsStore();
    await store.download('core', 'error');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/admin/logs/download?scope=core&stream=error',
      { headers: { Authorization: 'Bearer admin-test-token' } },
    );
    expect(vi.mocked(downloadBlob)).toHaveBeenCalledWith(blob, expect.stringContaining('core'));
    vi.unstubAllGlobals();
  });

  it('startTail() polls newest records on an interval and prepends only newer ones', async () => {
    vi.useFakeTimers();
    const store = useLogsStore();
    store.filters.scopes = ['core'];
    store.records = [makeRecord({ ts: 100, msg: 'old' })];

    vi.mocked(api.get).mockResolvedValue({
      records: [makeRecord({ ts: 200, msg: 'new' }), makeRecord({ ts: 100, msg: 'old' })],
      next_cursor: null,
      truncated: false,
    });

    store.startTail();
    expect(store.tailing).toBe(true);

    // Advance one poll interval and let the awaited poll resolve.
    await vi.advanceTimersByTimeAsync(store.tailIntervalMs);

    // Newest-first, the freshly-seen ts=200 record is prepended; ts=100 not duplicated.
    expect(store.records.map((record) => record.ts)).toEqual([200, 100]);

    store.stopTail();
    expect(store.tailing).toBe(false);
  });
});
