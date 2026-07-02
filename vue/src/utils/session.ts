/**
 * Boot-time stale-session purge (fe-admin counterpart of fe-user sprint
 * 2026-05-23/01, "flash-of-dashboard on a stale session").
 *
 * The core auth store's `initAuth()` restores a token from `localStorage`
 * without checking its `exp`. So on a fresh page load with an expired admin
 * JWT the store reports `isAuthenticated === true`, the router guard permits
 * a protected route, the admin view PAINTS, and only the subsequent `401 →
 * token-expired` round-trip bounces the user to `/login` — a visible flash of
 * admin UI to a session that is no longer valid.
 *
 * This helper reads the `exp` claim locally (signature-blind UX gate) and
 * purges the dead session SYNCHRONOUSLY at boot — before the app mounts and
 * the first navigation runs — so no protected admin view is ever painted for
 * an expired session. The existing `401` backstop stays as-is for tokens that
 * expire or are revoked mid-session.
 */
import { isTokenExpired } from './token';

/** Minimal shape of the auth store this helper mutates. */
interface PurgeableAuthStore {
  token: string | null;
  refreshToken: string | null;
  user: unknown;
}

/**
 * Purge a stale admin session if its JWT `exp` is in the past.
 *
 * @param authStore     the auth store (token/refreshToken/user cleared in place)
 * @param storageKey    localStorage key for the token (e.g. `admin_token`);
 *                      the `${key}_refresh` and `${key}_user` companions
 *                      (as written by the core auth store) are cleared too
 * @param clearApiToken clears the token on the shared ApiClient (injected — DI)
 * @param now           injected clock for deterministic tests (defaults `Date.now`)
 * @returns `true` when a stale session was purged, `false` otherwise
 */
export function purgeExpiredSession(
  authStore: PurgeableAuthStore,
  storageKey: string,
  clearApiToken: () => void,
  now: () => number = Date.now,
): boolean {
  const token = authStore.token;
  if (!token || !isTokenExpired(token, now)) return false;

  authStore.token = null;
  authStore.refreshToken = null;
  authStore.user = null;
  clearApiToken();

  localStorage.removeItem(storageKey);
  localStorage.removeItem(`${storageKey}_refresh`);
  localStorage.removeItem(`${storageKey}_user`);

  return true;
}
