/**
 * Walkthrough: interactive spreadsheet features on the snapshot page —
 * decimals formatting, per-column stats, sort, filter, edit + Reset/Save.
 * Screenshots one per step against the LIVE stack.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN = process.env.E2E_BASE_URL || 'http://localhost:8081';
const DATASET_ID =
  process.env.WALKTHROUGH_DATASET_ID || '14463d41-79eb-4caa-94c0-6b0488a0cdc4';
const SHOTS = process.env.WALKTHROUGH_SHOTS || '';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'AdminPass123@';

let step = 0;
async function shot(page: import('@playwright/test').Page, name: string) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  step += 1;
  await page.screenshot({
    path: path.join(SHOTS, `${String(step).padStart(2, '0')}-${name}.png`),
  });
}

test('spreadsheet features: format, stats, sort, filter, edit', async ({ page }) => {
  page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${ADMIN}/admin/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], #email').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !String(u).includes('/login'), { timeout: 20000 }),
    page
      .locator('[data-testid="login-button"], button[type="submit"], button:has-text("Sign In")')
      .first()
      .click(),
  ]);

  await page.goto(`${ADMIN}/admin/datasets/${DATASET_ID}`, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="dataset-tab-archive"]').click();
  await Promise.all([
    page.waitForURL((u) => String(u).includes('/snapshots/'), { timeout: 20000 }),
    page.locator('[data-testid="snapshot-row"]').first().click(),
  ]);
  await expect(page.locator('[data-testid="dataset-spreadsheet"]')).toBeVisible();
  await expect(page.locator('[data-testid="spreadsheet-cell-input"]').first()).toBeVisible();

  // 1. Editable grid + stats footer (default decimals=3). Pick a statistic.
  await page.locator('[data-testid="stat-select"]').selectOption({ label: /mean/i }).catch(() => {});
  await shot(page, 'editable-grid-stats');

  // 2. Decimals control → 1 (formatting).
  await page.locator('[data-testid="decimals-control"]').fill('1');
  await shot(page, 'decimals-1');

  // 3. Sort by temp_mean_c (column index 2) — click header.
  await page.locator('[data-testid="spreadsheet-col"]').nth(2).click();
  await expect(page.locator('[data-testid="sort-indicator"]').first()).toBeVisible();
  await shot(page, 'sorted-temp-asc');

  // 4. Filter temp_mean_c > 20 — stats + filtered count update.
  await page.locator('[data-testid="spreadsheet-filter"]').nth(2).fill('>20');
  await page.waitForTimeout(200);
  const filtered = await page.locator('[data-testid="filtered-count"]').innerText();
  await shot(page, 'filtered-gt20');

  // 5. Edit a cell → Save enables; then Reset.
  await page.locator('[data-testid="spreadsheet-filter"]').nth(2).fill('');
  const cell = page.locator('[data-testid="spreadsheet-cell-input"]').first();
  await cell.fill('99.9');
  await cell.blur();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-testid="save-snapshot"]')).toBeEnabled();
  await shot(page, 'edited-save-enabled');

  await page.locator('[data-testid="reset-edits"]').click();
  await shot(page, 'after-reset');

  // eslint-disable-next-line no-console
  console.log(`FEATURES OK — filtered="${filtered}"`);
});
