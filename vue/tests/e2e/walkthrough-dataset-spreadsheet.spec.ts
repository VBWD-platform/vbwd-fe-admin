/**
 * Walkthrough: dataset detail → Dataset tab → click a snapshot row → the
 * paginated spreadsheet page (classic functionality: header, scroll, Prev/Next,
 * page-size, row range). Captures one screenshot per step.
 *
 * Run against the LIVE stack:
 *   WALKTHROUGH_SHOTS=/abs/shots E2E_BASE_URL=http://localhost:8081 \
 *   npx playwright test walkthrough-dataset-spreadsheet --project=chromium
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
    fullPage: false,
  });
}

test('dataset → snapshot row → paginated spreadsheet', async ({ page }) => {
  page.setViewportSize({ width: 1440, height: 900 });

  // 1. Admin login (UI).
  await page.goto(`${ADMIN}/admin/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], #email').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !String(url).includes('/login'), { timeout: 20000 }),
    page
      .locator('[data-testid="login-button"], button[type="submit"], button:has-text("Sign In")')
      .first()
      .click(),
  ]);

  // 2. Dataset detail → Dataset tab.
  await page.goto(`${ADMIN}/admin/datasets/${DATASET_ID}`, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="dataset-tab-archive"]').click();
  await expect(page.locator('[data-testid="snapshot-archive"]')).toBeVisible();
  const rows = page.locator('[data-testid="snapshot-row"]');
  await expect(rows.first()).toBeVisible();
  await shot(page, 'dataset-tab-archive');

  // 3. Click the snapshot row → the spreadsheet page.
  await Promise.all([
    page.waitForURL((url) => String(url).includes('/snapshots/'), { timeout: 20000 }),
    rows.first().click(),
  ]);
  await expect(page.locator('[data-testid="dataset-spreadsheet"]')).toBeVisible();
  await expect(page.locator('[data-testid="spreadsheet-row"]').first()).toBeVisible();
  const range1 = await page.locator('[data-testid="snapshot-row-range"]').innerText();
  await shot(page, 'spreadsheet-page1');

  // 4. Classic pagination — Prev disabled at start, Next advances the window.
  await expect(page.locator('[data-testid="snapshot-page-prev"]')).toBeDisabled();
  await page.locator('[data-testid="snapshot-page-next"]').click();
  await expect(page.locator('[data-testid="dataset-spreadsheet"]')).toBeVisible();
  const range2 = await page.locator('[data-testid="snapshot-row-range"]').innerText();
  expect(range2).not.toEqual(range1);
  await expect(page.locator('[data-testid="snapshot-page-prev"]')).toBeEnabled();
  await shot(page, 'spreadsheet-page2');

  // 5. Change page size (classic functionality) and re-render.
  await page.locator('[data-testid="snapshot-page-size"]').selectOption('250');
  await expect(page.locator('[data-testid="dataset-spreadsheet"]')).toBeVisible();
  await shot(page, 'spreadsheet-pagesize-250');

  // eslint-disable-next-line no-console
  console.log(`WALKTHROUGH OK — page1="${range1}" page2="${range2}" shots="${SHOTS}"`);
});
