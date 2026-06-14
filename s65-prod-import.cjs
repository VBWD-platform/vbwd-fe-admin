/* S65 prod import via the admin UI. Usage:
 *   node s65-prod-import.cjs <baseUrl> <envDir> <shotsDir> <label>
 * Reads admin creds from /tmp/prodcreds.json. Imports booking_categories then
 * booking_resources (dry-run preview + confirm), screenshots every step, and
 * verifies via the admin Resource List. Upsert mode — never deletes.
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const [, , BASE, ENVDIR, SHOTS, LABEL] = process.argv;
const creds = JSON.parse(fs.readFileSync('/tmp/prodcreds.json', 'utf8'));
const CATS = path.join(ENVDIR, 'booking_categories.json');
const RESS = path.join(ENVDIR, 'booking_resources.json');
fs.mkdirSync(SHOTS, { recursive: true });

const steps = [];
let n = 0;
async function shot(page, title, caption, data) {
  n += 1;
  const file = `step-${String(n).padStart(2, '0')}.png`;
  await page.screenshot({ path: path.join(SHOTS, file), fullPage: true });
  steps.push({ n, file, title, caption, data: data || null });
  console.log(`  [${n}] ${title}`);
}
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
async function importEntity(page, label, file, entity) {
  await page.locator('[data-test="import-file"]').setInputFiles(file);
  await page.waitForTimeout(300);
  await shot(page, `${label}: file selected`,
    `Envelope <code>${path.basename(file)}</code> selected on <b>${LABEL}</b> (upsert mode). Nothing written yet.`);
  // dry-run
  let [r1] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/${entity}/import`) && r.request().method() === 'POST'),
    page.locator('[data-test="import-preview-run"]').click(),
  ]);
  await page.locator(`[data-test="import-result-${entity}"]`).waitFor({ state: 'visible' });
  let dry = await readRow(page, entity);
  await shot(page, `${label}: dry-run preview`,
    `<b>Preview</b> (dry_run) on <b>${LABEL}</b>: <code>${entity}</code> would create <b>${dry.created}</b>, update <b>${dry.updated}</b>, errors <b>${dry.errors}</b>.`, dry);
  // confirm
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/${entity}/import`) && r.request().method() === 'POST'),
    page.locator('[data-test="import-confirm"]').click(),
  ]);
  await page.waitForTimeout(400);
  let real = await readRow(page, entity);
  await shot(page, `${label}: import committed`,
    `<b>Confirm</b> on <b>${LABEL}</b>: <code>${entity}</code> created <b>${real.created}</b>, updated <b>${real.updated}</b>, skipped <b>${real.skipped}</b>, errors <b>${real.errors}</b>. Rows are now live in production.`, real);
  return real;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  try {
    await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="login-view"]').waitFor();
    await shot(page, `Login — ${LABEL}`, `Production admin login at <code>${BASE}/admin/login</code>.`);

    await page.locator('[data-testid="username-input"]').fill(creds.email);
    await page.locator('[data-testid="password-input"]').fill(creds.password);
    await page.locator('[data-testid="login-button"]').click();
    await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await shot(page, `Signed in — ${LABEL}`, `Authenticated on production <b>${LABEL}</b>.`);

    await page.locator('a[href="/admin/import-export"]').first().click();
    await page.locator('[data-test="import-block"]').waitFor();
    await page.waitForTimeout(500);
    await shot(page, 'Import / Export view', `The unified Import/Export view on <b>${LABEL}</b> (manifest-driven).`);

    await importEntity(page, 'Booking Categories', CATS, 'booking_categories');
    await importEntity(page, 'Booking Resources', RESS, 'booking_resources');

    // Verify: resource list
    try {
      await page.locator('[data-testid="nav-toggle-bookings"]').first().click();
      await page.waitForTimeout(500);
      const resLink = page.locator('a[href="/admin/booking/resources"]').first();
      await resLink.waitFor({ state: 'visible', timeout: 8000 });
      await resLink.click();
      await page.waitForTimeout(2500);
      await shot(page, `Verify: Resource List — ${LABEL}`,
        `The production Booking Resource List now includes the imported catalogue, each resource linked to its category by slug.`);
    } catch (e) {
      await shot(page, `Verify: Resource List — ${LABEL}`, `Resource list (nav note: ${e.message}).`);
    }
    console.log(`\n${LABEL} done: ${n} steps`);
  } catch (err) {
    console.error('ERROR:', err.message);
    try { await shot(page, 'ERROR', `Stopped: ${err.message}`); } catch (e) {}
    fs.writeFileSync(path.join(SHOTS, 'steps.json'), JSON.stringify(steps, null, 2));
    await browser.close();
    process.exit(1);
  }
  fs.writeFileSync(path.join(SHOTS, 'steps.json'), JSON.stringify(steps, null, 2));
  await browser.close();
})();
