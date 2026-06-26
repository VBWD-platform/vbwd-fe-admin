import { defineStore } from 'pinia';
import { downloadBlob } from 'vbwd-view-component';
import {
  fetchLogScopes,
  queryLogs,
  downloadLogs,
  type LogQueryParams,
  type LogQueryResponse,
} from '@/api/logsApi';

export type { LogRecord } from '@/api/logsApi';

/**
 * Live-tail polling interval. The Logs view tails by re-querying the newest
 * records on this cadence rather than via SSE/EventSource: EventSource cannot
 * send the `Authorization: Bearer` header that this admin app uses (the token
 * lives in memory on the shared ApiClient, not as a query param, and there is
 * no logs stream-token mint endpoint). A bounded poll is correct and keeps each
 * request small (nginx caps admin API at 60s). See sprint S106.3.
 */
const TAIL_POLL_INTERVAL_MS = 2000;

/** Default page size for a query / load-more page (server caps at 1000). */
const DEFAULT_LIMIT = 200;

export interface LogFilters {
  scopes: string[];
  streams: string[];
  level: string;
  /** Rolling time window in minutes; `null` means "use allHistory or default". */
  minutes: number | null;
  /** When true, send `since=0` to read all retained history. */
  allHistory: boolean;
  contains: string;
  limit: number;
}

function createDefaultFilters(): LogFilters {
  return {
    scopes: [],
    streams: [],
    level: '',
    minutes: 60,
    allHistory: false,
    contains: '',
    limit: DEFAULT_LIMIT,
  };
}

/**
 * Build the query params from the active filters, omitting empties so the
 * backend applies its own defaults. Multiple scopes/streams are comma-joined
 * (the backend accepts comma-separated or repeated params).
 */
function buildQueryParams(filters: LogFilters): LogQueryParams {
  const params: LogQueryParams = {};
  if (filters.scopes.length > 0) {
    params.scope = filters.scopes.join(',');
  }
  if (filters.streams.length > 0) {
    params.stream = filters.streams.join(',');
  }
  if (filters.level) {
    params.level = filters.level;
  }
  if (filters.allHistory) {
    params.since = 0;
  } else if (filters.minutes !== null) {
    params.minutes = filters.minutes;
  }
  if (filters.contains) {
    params.contains = filters.contains;
  }
  params.limit = filters.limit;
  return params;
}

/** Newest-ts-first identity key so the live tail never re-inserts a seen record. */
function recordKey(record: { ts: number; logger?: string; msg?: string; event?: string }): string {
  return `${record.ts}|${record.logger ?? ''}|${record.msg ?? record.event ?? ''}`;
}

export const useLogsStore = defineStore('logs', {
  state: () => ({
    records: [] as LogQueryResponse['records'],
    availableScopes: [] as string[],
    availableStreams: [] as string[],
    filters: createDefaultFilters(),
    nextCursor: null as string | null,
    truncated: false,
    bytesScanned: 0,
    segmentsScanned: 0,
    malformedSkipped: 0,
    loading: false,
    tailing: false,
    tailIntervalMs: TAIL_POLL_INTERVAL_MS,
    error: null as string | null,
    tailTimer: null as ReturnType<typeof setInterval> | null,
  }),

  getters: {
    hasMore: (state): boolean => state.nextCursor !== null,
  },

  actions: {
    async fetchScopes(): Promise<void> {
      this.error = null;
      try {
        const response = await fetchLogScopes();
        this.availableScopes = response.scopes;
        this.availableStreams = response.streams;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch log scopes';
        throw error;
      }
    },

    async query(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const response = await queryLogs(buildQueryParams(this.filters));
        this.records = response.records;
        this.nextCursor = response.next_cursor ?? null;
        this.truncated = response.truncated ?? false;
        this.bytesScanned = response.bytes_scanned ?? 0;
        this.segmentsScanned = response.segments_scanned ?? 0;
        this.malformedSkipped = response.malformed_skipped ?? 0;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to query logs';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async loadMore(): Promise<void> {
      if (this.nextCursor === null) {
        return;
      }
      this.loading = true;
      this.error = null;
      try {
        const params = buildQueryParams(this.filters);
        params.cursor = this.nextCursor;
        const response = await queryLogs(params);
        this.records = [...this.records, ...response.records];
        this.nextCursor = response.next_cursor ?? null;
        this.truncated = response.truncated ?? false;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to load more logs';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async download(scope: string, stream: string): Promise<void> {
      this.error = null;
      try {
        const blob = await downloadLogs(scope, stream);
        downloadBlob(blob, `logs-${scope}-${stream}.ndjson`);
      } catch (error) {
        this.error = (error as Error).message || 'Failed to download logs';
        throw error;
      }
    },

    /**
     * One tail poll: re-query the newest page and prepend any records that are
     * newer than (or unseen relative to) what is already on top of the list.
     */
    async pollTail(): Promise<void> {
      try {
        const response = await queryLogs(buildQueryParams(this.filters));
        const seenKeys = new Set(this.records.map((record) => recordKey(record)));
        const freshRecords = response.records.filter(
          (record) => !seenKeys.has(recordKey(record)),
        );
        if (freshRecords.length > 0) {
          this.records = [...freshRecords, ...this.records];
        }
      } catch (error) {
        // A transient tail-poll failure must not tear down the tail; surface it
        // but keep polling so a brief blip self-heals.
        this.error = (error as Error).message || 'Live tail poll failed';
      }
    },

    startTail(): void {
      if (this.tailing) {
        return;
      }
      this.tailing = true;
      this.tailTimer = setInterval(() => {
        void this.pollTail();
      }, this.tailIntervalMs);
    },

    stopTail(): void {
      if (this.tailTimer !== null) {
        clearInterval(this.tailTimer);
        this.tailTimer = null;
      }
      this.tailing = false;
    },

    reset(): void {
      this.stopTail();
      this.records = [];
      this.availableScopes = [];
      this.availableStreams = [];
      this.filters = createDefaultFilters();
      this.nextCursor = null;
      this.truncated = false;
      this.bytesScanned = 0;
      this.segmentsScanned = 0;
      this.malformedSkipped = 0;
      this.loading = false;
      this.error = null;
    },
  },
});
