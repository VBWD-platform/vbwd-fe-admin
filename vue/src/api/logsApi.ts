/**
 * Logs API adapter (S106.3).
 *
 * Thin typed wrapper over the shared `ApiClient` singleton for the core admin
 * log-management read API (`/api/v1/admin/logs*`). All endpoints require admin
 * auth + the `logs.read` permission server-side. URLs are relative to the
 * client base path (`/api/v1`), consistent with the rest of fe-admin.
 *
 * Endpoints:
 *   GET /admin/logs/scopes   -> { scopes, streams }
 *   GET /admin/logs          -> { records, next_cursor, truncated, ... }
 *   GET /admin/logs/download -> application/x-ndjson (blob)
 *
 * The download uses `fetch` (carrying the auth token explicitly) rather than the
 * shared client's `get`, because `ApiClient.get` does not forward `responseType`
 * — only `post` does — and we must not modify the core client for this feature.
 *
 * Live tail is implemented in the store via short-interval polling of the query
 * endpoint rather than SSE — see `stores/logs.ts` for the rationale.
 */
import { api } from '@/api';

/** A standard application log record (error/warnings/info streams). */
export interface LogMessageRecord {
  ts: number;
  level: string;
  scope: string;
  stream: string;
  logger?: string;
  msg?: string;
  [extraField: string]: unknown;
}

/** An audit record from the events stream — `event` + `payload` instead of `msg`. */
export interface LogEventRecord {
  ts: number;
  event: string;
  payload?: unknown;
  scope: string;
  stream: string;
  [extraField: string]: unknown;
}

export type LogRecord = LogMessageRecord | LogEventRecord;

export interface LogScopesResponse {
  scopes: string[];
  streams: string[];
}

export interface LogQueryParams {
  scope?: string;
  stream?: string;
  level?: string;
  minutes?: number;
  since?: number;
  until?: number;
  contains?: string;
  limit?: number;
  cursor?: string;
  // Index signature so the bag satisfies the ApiClient `params` type
  // (`Record<string, unknown>`) without a cast.
  [queryKey: string]: string | number | undefined;
}

export interface LogQueryResponse {
  records: LogRecord[];
  next_cursor: string | null;
  truncated?: boolean;
  bytes_scanned?: number;
  segments_scanned?: number;
  malformed_skipped?: number;
}

export function fetchLogScopes(): Promise<LogScopesResponse> {
  return api.get<LogScopesResponse>('/admin/logs/scopes');
}

export function queryLogs(params: LogQueryParams): Promise<LogQueryResponse> {
  return api.get<LogQueryResponse>('/admin/logs', { params });
}

/**
 * Fetch the chronological ndjson dump of a single scope/stream as a blob.
 *
 * Uses `fetch` with an explicit `Authorization` header (the in-memory token
 * held by the shared client) because the core `ApiClient.get` cannot request a
 * blob response.
 */
export async function downloadLogs(scope: string, stream: string): Promise<Blob> {
  const query = new URLSearchParams({ scope, stream }).toString();
  const url = `${api.baseURL}/admin/logs/download?${query}`;
  const token = api.getToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Log download failed (${response.status})`);
  }
  return response.blob();
}
