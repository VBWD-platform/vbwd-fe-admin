import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Diagnostic: walk to the admin plugin details page for a single plugin
 * (cms by default) and capture:
 *   - all console messages (log/info/warn/error/debug)
 *   - every XHR/fetch response for /api/ and /_plugins and /plugins.json and /config.json
 *   - screenshots at each step
 *
 * Used to pinpoint why the admin plugin config appears empty on prod.
 *
 * Run:
 *   E2E_BASE_URL=https://vbwd.cc       npx playwright test prod-admin-plugin-config-diag
 *   E2E_BASE_URL=http://localhost:8081 npx playwright test prod-admin-plugin-config-diag
 */

const PLUGIN = process.env.PLUGIN_NAME ?? 'cms';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'AdminPass123@';

const OUT = path.join('test-results', `plugin-config-diag-${PLUGIN}`);
fs.mkdirSync(OUT, { recursive: true });

function write(name: string, content: string) {
  fs.writeFileSync(path.join(OUT, name), content);
}

test.describe(`admin plugin config diagnostic — ${PLUGIN}`, () => {
  test.setTimeout(120_000);

  test(`walk: login → plugin details → screenshots + logs`, async ({ page }) => {
    const consoleLog: string[] = [];
    const apiLog: string[] = [];

    page.on('console', (msg) => {
      consoleLog.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      consoleLog.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`);
    });
    page.on('response', async (response) => {
      const url = response.url();
      if (!/\/(api|_plugins|plugins\.json|config\.json)/.test(url)) return;
      const status = response.status();
      let body = '';
      try {
        body = (await response.text()).substring(0, 600);
      } catch {}
      apiLog.push(`${status} ${response.request().method()} ${url}\n  → ${body}\n`);
    });

    // ── Step 1: go to login
    await page.goto('/admin/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUT, '01-initial.png'), fullPage: true });

    // ── Step 2: login via UI (more realistic than localStorage injection)
    if (await page.locator('[data-testid="email"]').count() === 0) {
      // already logged in or different selector — try to navigate to /admin/login
      await page.goto('/admin/login', { waitUntil: 'networkidle' }).catch(() => {});
    }
    const emailInput = page.locator('input[type="email"], [data-testid="email"]').first();
    const passwordInput = page.locator('input[type="password"], [data-testid="password"]').first();
    const submitButton = page.locator('button[type="submit"], [data-testid="login-button"]').first();

    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(ADMIN_EMAIL);
      await passwordInput.fill(ADMIN_PASSWORD);
      await page.screenshot({ path: path.join(OUT, '02-login-filled.png'), fullPage: true });
      await submitButton.click();
      await page.waitForLoadState('networkidle');
    }
    await page.screenshot({ path: path.join(OUT, '03-after-login.png'), fullPage: true });

    // ── Step 3: go to settings (plugin list)
    await page.goto('/admin/settings', { waitUntil: 'networkidle' }).catch(() => {});
    await page.screenshot({ path: path.join(OUT, '04-settings.png'), fullPage: true });

    // ── Step 4: go to backend plugin details (the page the user is seeing blank)
    await page.goto(`/admin/settings/backend-plugins/${PLUGIN}`, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000); // let async UI settle
    await page.screenshot({ path: path.join(OUT, '05-plugin-detail.png'), fullPage: true });

    // Capture the details markup
    const detailHtml = await page.locator('.plugin-details-view, main').first().innerHTML().catch(() => '');
    write('plugin-detail.html', detailHtml);

    // ── Save logs
    write('console.log', consoleLog.join('\n'));
    write('api.log', apiLog.join('\n'));

    console.log(`\n=== [${PLUGIN}] console messages (${consoleLog.length}) ===`);
    console.log(consoleLog.slice(-30).join('\n'));
    console.log(`\n=== [${PLUGIN}] api responses (${apiLog.length}) ===`);
    console.log(apiLog.slice(-20).join('\n'));

    // Soft assertions: report what's wrong without aborting the data capture
    const errors = consoleLog.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
    expect.soft(errors, `${errors.length} console errors:\n${errors.join('\n')}`).toHaveLength(0);

    const fourOhFours = apiLog.filter((l) => /^404 /.test(l));
    expect.soft(fourOhFours, `${fourOhFours.length} 404s:\n${fourOhFours.join('\n')}`).toHaveLength(0);

    const errorMessage = page.locator('[data-testid="error-message"]');
    const errorText = (await errorMessage.textContent().catch(() => '')) ?? '';
    expect.soft(errorText.trim(), `UI error banner: "${errorText}"`).toBe('');
  });
});
