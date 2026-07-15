/**
 * fe-user (user-facing app) origin — the single source of truth for where the
 * user app lives relative to this admin app.
 *
 * fe-admin runs on a different origin from fe-user. Backend provisioning
 * refusals (buy tokens / upgrade plan) and the User Plugin bridge return
 * fe-user *paths* (e.g. `/dashboard/tokens`, `/checkout?tarif_plan_id=pro`);
 * resolving them against this base turns them into absolute, clickable URLs
 * that navigate the operator into the fe-user app.
 *
 * `??` (not `||`) so a CI/prod same-origin build can pass an explicit empty
 * string. Dev default assumes fe-user is reachable at :8080 (docker-compose).
 */
export const FE_USER_BASE_URL = import.meta.env.VITE_USER_APP_URL ?? 'http://localhost:8080';

/**
 * Resolve a fe-user path (or an already-absolute URL) to an absolute,
 * clickable URL. When the base is empty (same-origin build) the path is
 * returned unchanged so the browser resolves it against the current origin.
 */
export function resolveFeUserUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  if (!FE_USER_BASE_URL) {
    return pathOrUrl;
  }
  return new URL(pathOrUrl, FE_USER_BASE_URL).toString();
}
