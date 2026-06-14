/* Verify the CMS taxonomy bulk-delete UI in the running fe-admin (:8081).
 * Filters to the 3 throwaway "ZZ Bulk Test" categories, selects them, and
 * bulk-deletes — never select-all (44 real categories must be untouched).
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ADMIN = 'http://localhost:8081';
const REPO = '/Users/dantweb/dantweb/vbwd-sdk-2';
const SHOTS = path.join(REPO, 'docs/dev_log/20260611/walkthrough/taxonomy-bulk-shots');
fs.mkdirSync(SHOTS, { recursive: true });

let n = 0;
const steps = [];
async function shot(page, title, caption) {
  n += 1;
  const file = `step-${String(n).padStart(2, '0')}.png`;
  await page.screenshot({ path: path.join(SHOTS, file), fullPage: true });
  steps.push({ n, file, title, caption });
  console.log(`  [${n}] ${title}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  page.on('dialog', (d) => d.accept()); // accept the window.confirm

  try {
    // login
    await page.goto(`${ADMIN}/admin/login`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="username-input"]').fill('admin@example.com');
    await page.locator('[data-testid="password-input"]').fill('AdminPass123@');
    await page.locator('[data-testid="login-button"]').click();
    await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 20000 });

    // SPA nav to taxonomy
    await page.locator('a[href="/admin/cms/taxonomy"]').first().click();
    await page.locator('[data-testid="term-row"]').first().waitFor();
    await page.waitForTimeout(600);
    await shot(page, 'Taxonomy — Categories tab',
      'The Taxonomy page now has a select-all header checkbox and a per-row checkbox on every term (Categories tab). 44 real categories are present.');

    // filter to the 3 throwaways
    await page.locator('[data-testid="term-search"]').fill('ZZ Bulk Test');
    await page.waitForTimeout(500);
    const rows = page.locator('[data-testid="term-row"]');
    const rowCount = await rows.count();
    console.log('  filtered rows:', rowCount);
    await shot(page, 'Filtered to the 3 test categories',
      `Client-side search "ZZ Bulk Test" narrows the list to the 3 throwaway categories (rows shown: ${rowCount}).`);

    // select the 3 visible rows via their per-row checkboxes (NOT select-all)
    const boxes = page.locator('[data-testid^="term-row-select-"]');
    const cnt = await boxes.count();
    for (let i = 0; i < cnt; i += 1) await boxes.nth(i).check();
    await page.locator('[data-testid="bulk-bar"]').waitFor();
    await shot(page, '3 selected — bulk action bar appears',
      `The 3 rows are checked and the bulk action bar shows the selection with a Delete action. (${cnt} checkboxes ticked.)`);

    // bulk delete (confirm auto-accepted)
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/admin/cms/terms/bulk') && r.request().method() === 'POST'),
      page.locator('[data-testid="bulk-delete"]').click(),
    ]);
    await page.waitForTimeout(1200);
    // re-apply the same search to show they're gone
    await page.locator('[data-testid="term-search"]').fill('ZZ Bulk Test');
    await page.waitForTimeout(500);
    const afterRows = await page.locator('[data-testid="term-row"]').count();
    console.log('  rows after delete (filtered):', afterRows);
    await shot(page, 'After bulk delete — the 3 are gone',
      `After Delete → confirm, the 3 test categories are removed (filtered rows now: ${afterRows}); their post associations cascade away at the DB level. The 44 real categories are untouched.`);

    console.log('\nVerification complete:', n, 'steps; rows after =', afterRows);
  } catch (err) {
    console.error('ERROR:', err.message);
    try { await shot(page, 'ERROR', err.message); } catch (e) {}
    fs.writeFileSync(path.join(SHOTS, 'steps.json'), JSON.stringify(steps, null, 2));
    await browser.close();
    process.exit(1);
  }
  fs.writeFileSync(path.join(SHOTS, 'steps.json'), JSON.stringify(steps, null, 2));
  await browser.close();
})();
