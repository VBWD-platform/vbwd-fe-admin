import { test, expect, request as apiRequest } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Reproduces the 'Plugin "cms" not found' / 500 error that appears when an
 * admin tries to deactivate a backend plugin on vbwd.cc.
 *
 * Run:
 *   E2E_BASE_URL=http://localhost:8081  npx playwright test prod-admin-plugin-toggle
 *   E2E_BASE_URL=https://vbwd.cc        npx playwright test prod-admin-plugin-toggle
 *
 * API calls hit ${API_BASE_URL} (defaults to same origin as E2E_BASE_URL, with
 * /admin stripped). Screenshots land in test-results/.
 */

const API_BASE = (process.env.API_BASE_URL
  ?? (process.env.E2E_BASE_URL ?? 'http://localhost:8081').replace(/\/admin\/?$/, '')
).replace(/\/$/, '');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'AdminPass123@';

const SCREENSHOT_DIR = path.join('test-results', 'admin-plugin-toggle');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function getToken(): Promise<string> {
  const ctx = await apiRequest.newContext();
  const response = await ctx.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const body = await response.json();
  const token = body.token || body.access_token;
  if (!token) throw new Error(`no token in ${JSON.stringify(body)}`);
  return token;
}

test.describe('admin backend plugin enable/disable', () => {
  test('GET /api/v1/admin/plugins lists plugins with statuses', async () => {
    const token = await getToken();
    const ctx = await apiRequest.newContext();
    const response = await ctx.get(`${API_BASE}/api/v1/admin/plugins`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status(), await response.text()).toBe(200);
    const { plugins } = await response.json();
    const names = plugins.map((p: { name: string }) => p.name).sort();
    console.log('[AUDIT] plugins in registry:', names);

    expect(names).toContain('cms');
  });

  test('POST /api/v1/admin/plugins/cms/disable succeeds (this is the failing op)', async () => {
    const token = await getToken();
    const ctx = await apiRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });

    const disableResp = await ctx.post(`${API_BASE}/api/v1/admin/plugins/cms/disable`);
    const body = await disableResp.text();
    console.log(`[AUDIT] disable cms → ${disableResp.status()}: ${body.substring(0, 300)}`);

    expect(disableResp.status(), body).toBe(200);

    // Re-enable so test is idempotent
    await ctx.post(`${API_BASE}/api/v1/admin/plugins/cms/enable`);
  });

  test('UI: navigate to a plugin details page and click Deactivate', async ({ page }) => {
    // Intercept console + network so we can see what the failure looks like
    const consoleMessages: string[] = [];
    const apiResponses: Array<{ url: string; status: number; body: string }> = [];
    page.on('console', (msg) => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/v1/admin/plugins/')) {
        const body = await response.text().catch(() => '');
        apiResponses.push({ url, status: response.status(), body: body.substring(0, 300) });
      }
    });

    // Seed a token via the login endpoint, then set it in localStorage so the
    // SPA treats us as authenticated without the UI login dance.
    const token = await getToken();
    await page.addInitScript((t) => {
      window.localStorage.setItem('auth_token', t);
      window.localStorage.setItem('token', t);
    }, token);

    await page.goto('/admin/settings', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-settings.png'), fullPage: true });

    // Navigate directly to the admin plugin details for cms
    await page.goto('/admin/plugins/cms', { waitUntil: 'networkidle' }).catch(() => {});
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-plugin-detail.png'), fullPage: true });

    // Click Deactivate if present
    const deactivate = page.locator('[data-testid="deactivate-plugin-btn"]');
    if (await deactivate.isVisible().catch(() => false)) {
      // Dismiss native confirm dialog
      page.once('dialog', (d) => d.accept());
      await deactivate.click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-after-deactivate.png'), fullPage: true });

    console.log('[AUDIT] API responses during test:');
    for (const r of apiResponses) console.log(`  ${r.status} ${r.url} — ${r.body}`);

    const errorMessage = page.locator('[data-testid="error-message"]');
    const errorVisible = await errorMessage.isVisible().catch(() => false);
    if (errorVisible) {
      const text = await errorMessage.textContent();
      console.log(`[AUDIT] error message visible: "${text}"`);
    }

    // The test passes when there's no disable failure; reports the error text if any
    const failed500 = apiResponses.find((r) => r.status >= 500);
    expect.soft(failed500, failed500 ? `500 from ${failed500.url}: ${failed500.body}` : '').toBeFalsy();
    expect.soft(errorVisible, 'error-message should NOT be visible after a successful toggle').toBe(false);
  });
});
