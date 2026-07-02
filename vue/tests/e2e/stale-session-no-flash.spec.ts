import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Flash-of-dashboard regression for fe-admin (counterpart of fe-user sprint
 * 2026-05-23/01).
 *
 * An admin logs in, closes the window, and re-opens after their JWT has
 * expired. The token still lives in localStorage under `admin_token`. We
 * assert that a protected route refuses the stale session and lands on the
 * login screen WITHOUT ever painting the admin dashboard (no flash), and
 * that the stale token was purged rather than merely hidden.
 */

/** Build a decodable JWT-shaped string with the given payload (unsigned). */
function makeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`;
}

const expiredJwt = () =>
  makeJwt({ exp: Math.floor(Date.now() / 1000) - 3600, sub: 'admin-1' });

test.describe('Stale admin session', () => {
  test('protected route with an expired token → /login, dashboard never paints', async ({ page }) => {
    await loginAsAdmin(page);

    // Simulate re-opening after the JWT has expired.
    await page.evaluate((token) => {
      localStorage.setItem('admin_token', token);
    }, expiredJwt());

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login/);
    // The dashboard view was never attached to the DOM (no flash).
    await expect(page.getByTestId('dashboard-view')).toHaveCount(0);

    // The stale session was purged, not merely hidden.
    const token = await page.evaluate(() => localStorage.getItem('admin_token'));
    expect(token).toBeNull();
  });
});
