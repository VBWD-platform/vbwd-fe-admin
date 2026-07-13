/**
 * License API adapter (S135-CLIENT §2.5).
 *
 * Thin typed wrapper over the shared `ApiClient` singleton for the core client
 * license routes (`/api/v1/admin/license*`). All endpoints require admin auth;
 * GET is gated by `license.view`, POST/DELETE by `license.manage` server-side.
 * URLs are relative to the client base path (`/api/v1`), consistent with the
 * rest of fe-admin.
 *
 * The tab is fully agnostic: it renders whatever the backend reports (edition,
 * seat limits, per-key scopes) and names no product, plugin, or feature itself.
 *
 * Endpoints:
 *   GET    /admin/license            -> LicenseStatusPayload
 *   POST   /admin/license/keys       -> AddKeyResult  (body {code} or {envelope})
 *   DELETE /admin/license/keys/<id>  -> { removed }
 */
import { api } from '@/api';

/** Global seat usage. `used` is null until seat accounting lands (S137). */
export interface LicenseSeatUsage {
  used: number | null;
  limit: number | null;
}

/** One row in the extensible resource-usage list (seats today). */
export interface LicenseResource {
  resource: string;
  limit: number | null;
  used: number | null;
}

/** A registry-declared licensable feature and whether a held key covers it. */
export interface LicenseFeature {
  feature: string;
  licensed: boolean;
}

/** One held key as returned in the status payload's `keys` array. */
export interface LicenseKeyRow {
  key_id: string;
  scope: string[];
  status: string;
  customer: string | null;
  edition: string | null;
  expires_at: string | null;
  seat_limit: number | null;
}

/** The full body served by `GET /api/v1/admin/license`. */
export interface LicenseStatusPayload {
  configured: boolean;
  active: boolean;
  edition: string | null;
  seats: LicenseSeatUsage;
  resources: LicenseResource[];
  features: LicenseFeature[];
  keys: LicenseKeyRow[];
  required: boolean;
  degraded: boolean;
}

/** The 201 body returned when a key is added by code or envelope. */
export interface AddKeyResult {
  key_id: string;
  scope: string[];
  status: string;
}

export function getStatus(): Promise<LicenseStatusPayload> {
  return api.get<LicenseStatusPayload>('/admin/license');
}

/** Redeem a dashboard license code — the hub mints an instance-bound envelope. */
export function addKeyByCode(code: string): Promise<AddKeyResult> {
  return api.post<AddKeyResult>('/admin/license/keys', { code });
}

/** Add an offline/air-gapped signed envelope, verified locally. */
export function addKeyByEnvelope(envelope: string): Promise<AddKeyResult> {
  return api.post<AddKeyResult>('/admin/license/keys', { envelope });
}

export function removeKey(keyId: string): Promise<{ removed: string }> {
  return api.delete<{ removed: string }>(`/admin/license/keys/${keyId}`);
}
