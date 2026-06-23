/* S101.2 — fe-admin Pharmacy section walkthrough. Logs in via the UI, then
 * navigates the Pharmacy nav group + views, screenshotting the catalogue list,
 * a class-conditional product editor, and the compliance/region config.
 * Run from vbwd-fe-admin (resolves @playwright/test from its node_modules).
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ADMIN = process.env.ADMIN_URL || 'http://localhost:8081';
const SHOTS = '/Users/dantweb/dantweb/vbwd-sdk-2/docs/dev_log/20260622/walkthrough/s101';
fs.mkdirSync(SHOTS, { recursive: true });

async function shot(page, file) {
  await page.screenshot({ path: path.join(SHOTS, file), fullPage: true });
  console.log('  wrote', file);
}

(async () => {
  const consoleErrors = [];
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Seed BOTH auth keys so URL navigations survive the auth guard.
  const loginResp = await ctx.request.post(`${ADMIN}/api/v1/auth/login`, {
    data: { email: 'admin@example.com', password: 'AdminPass123@' },
  });
  const loginBody = await loginResp.json();
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_token_user', JSON.stringify(user));
  }, { token: loginBody.token, user: loginBody.user });

  try {
    // (a) Catalogue list
    await page.goto(`${ADMIN}/admin/pharma/products`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="pharma-products-table"]').waitFor();
    await page.waitForTimeout(800);
    await shot(page, 'admin-01-catalogue-list.png');

    // filter by RX to demonstrate product_class filtering
    await page.locator('[data-testid="pharma-class-filter"]').selectOption('RX');
    await page.waitForTimeout(400);
    await shot(page, 'admin-02-catalogue-rx-filtered.png');

    // (b) Product editor — open the first row, show class-conditional fields
    await page.locator('[data-testid="pharma-class-filter"]').selectOption('OTC');
    await page.waitForTimeout(400);
    const firstRow = page.locator('[data-testid^="pharma-row-"]').first();
    await firstRow.click();
    await page.locator('[data-testid="pharma-product-form"]').waitFor();
    await page.waitForTimeout(800);
    await shot(page, 'admin-03-editor-otc-required-fields.png');

    // switch class to MEDICAL_DEVICE — visible subset + required markers change
    await page.locator('[data-testid="pharma-product-class"]').selectOption('MEDICAL_DEVICE');
    await page.waitForTimeout(400);
    await shot(page, 'admin-04-editor-device-conditional-fields.png');

    // switch to RX — prescription-required gating notice
    await page.locator('[data-testid="pharma-product-class"]').selectOption('RX');
    await page.waitForTimeout(400);
    await shot(page, 'admin-05-editor-rx-blocked-notice.png');

    // (c) Compliance / region config
    await page.goto(`${ADMIN}/admin/pharma/compliance`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="pharma-region-banner"]').waitFor();
    await page.waitForTimeout(800);
    await shot(page, 'admin-06-compliance-region.png');

    console.log('\nConsole errors during run:', consoleErrors.length);
    consoleErrors.slice(0, 10).forEach((e) => console.log('  ERR:', e));
  } catch (err) {
    console.error('WALKTHROUGH FAILED:', err.message);
    await shot(page, 'admin-FAILURE.png');
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
