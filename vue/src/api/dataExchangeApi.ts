/**
 * DataExchangeApi adapter (S46.4).
 *
 * The fe-core data-exchange surface (`useDataExchange`, `ImportExportPage`,
 * `ImportExportControls`) depends on a narrow `DataExchangeApi` port so it stays
 * decoupled from any concrete HTTP client. fe-admin supplies this adapter over
 * its shared singleton `ApiClient`:
 *   - getJson         → api.get(url)
 *   - postForBlob     → api.post(url, body, { responseType: 'blob' })
 *   - postFormForJson → api.post(url, formData)  (the ApiClient request
 *     interceptor already drops the JSON Content-Type for FormData so the
 *     browser can set the multipart boundary)
 *
 * URLs are passed relative to the ApiClient base path (`/api/v1`), consistent
 * with the rest of fe-admin.
 */
import { api } from '@/api';
import type { DataExchangeApi } from 'vbwd-view-component';

/**
 * fe-core's `useDataExchange` builds absolute URLs that include the `/api/v1`
 * prefix, but the fe-admin `ApiClient` already prepends that prefix via its
 * `baseURL`. Strip a leading `/api/v1` so the request is not double-prefixed.
 * URLs that are already relative pass through unchanged.
 */
const API_PREFIX = '/api/v1';

function toRelative(url: string): string {
  return url.startsWith(API_PREFIX) ? url.slice(API_PREFIX.length) || '/' : url;
}

export function createDataExchangeApi(): DataExchangeApi {
  return {
    getJson<T = unknown>(url: string): Promise<T> {
      return api.get<T>(toRelative(url));
    },
    postForBlob(url: string, body: unknown): Promise<Blob> {
      return api.post<Blob>(toRelative(url), body, { responseType: 'blob' });
    },
    postFormForJson<T = unknown>(url: string, form: FormData): Promise<T> {
      return api.post<T>(toRelative(url), form);
    },
  };
}
