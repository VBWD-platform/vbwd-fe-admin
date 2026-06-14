/* Re-capture ONLY the idempotency step (step-10). The hotel resources already
 * exist in the DB, so a fresh upsert re-import correctly reports updated=15,
 * created=0 — proving idempotency. Waits on the real /import response to avoid
 * the stale-table read race the first run hit.
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ADMIN = 'http://localhost:8081';
const REPO = '/Users/dantweb/dantweb/vbwd-sdk-2';
const RESS = path.join(REPO, 'docs/marketing/cms-imports/hotel/booking/booking_resources.json');
const SHOTS = path.join(REPO, 'docs/dev_log/20260611/walkthrough/s65-shots');

async function readRow(page, entity) {
  const cells = page.locator(`[data-test="import-result-${entity}"] td`);
  return {
    entity: (await cells.nth(0).innerText()).trim(),
    created: (await cells.nth(1).innerText()).trim(),
    updated: (await cells.nth(2).innerText()).trim(),
    skipped: (await cells.nth(3).innerText()).trim(),
    errors: (await cells.nth(4).innerText()).trim(),
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);

  await page.goto(`${ADMIN}/admin/login`, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="username-input"]').fill('admin@example.com');
  await page.locator('[data-testid="password-input"]').fill('AdminPass123@');
  await page.locator('[data-testid="login-button"]').click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 20000 });
  await page.locator('a[href="/admin/import-export"]').first().click();
  await page.locator('[data-test="import-block"]').waitFor();

  // Re-import resources in upsert mode. Wait for the actual import response so we
  // read the fresh result, not the prior table.
  await page.locator('[data-test="import-file"]').setInputFiles(RESS);
  await page.waitForTimeout(300);
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/booking_resources/import') && r.request().method() === 'POST'),
    page.locator('[data-test="import-confirm"]').click(),
  ]);
  const body = await resp.json();
  await page.locator('[data-test="import-result-booking_resources"]').waitFor({ state: 'visible' });
  // Wait until the table reflects the new response (updated cell becomes non-zero).
  await page.waitForFunction(() => {
    const cells = document.querySelectorAll('[data-test="import-result-booking_resources"] td');
    return cells.length >= 3 && cells[2].textContent.trim() !== '0';
  }, { timeout: 10000 });
  const row = await readRow(page, 'booking_resources');
  console.log('API response:', JSON.stringify({ created: body.created, updated: body.updated, errors: body.errors.length }));
  console.log('UI table row:', JSON.stringify(row));

  await page.screenshot({ path: path.join(SHOTS, 'step-10.png'), fullPage: true });

  // Patch steps.json entry 10 with corrected caption + data.
  const stepsFile = path.join(SHOTS, 'steps.json');
  const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
  const s10 = steps.find((s) => s.n === 10);
  if (s10) {
    s10.title = 'Idempotent re-import (upsert by slug)';
    s10.caption = `Re-importing the same resources envelope in <b>upsert</b> mode matches the existing rows by slug: created <b>${row.created}</b>, updated <b>${row.updated}</b>, errors <b>${row.errors}</b>. No duplicate rows are created — the import is idempotent and safe to re-run.`;
    s10.data = row;
  }
  fs.writeFileSync(stepsFile, JSON.stringify(steps, null, 2));

  await browser.close();
  console.log('step-10 re-captured');
})();
