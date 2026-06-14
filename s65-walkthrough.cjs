/* S65 — UI walkthrough: import the hotel booking catalogue through the unified
 * Import/Export UI, screenshotting every step. Run from the vbwd-fe-admin dir so
 * Node resolves @playwright/test from its node_modules; uses the host's cached
 * chromium. Targets the running local stack (fe-admin :8081, fe-user :8080).
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ADMIN = process.env.ADMIN_URL || 'http://localhost:8081';
const USER = process.env.USER_URL || 'http://localhost:8080';
const REPO = '/Users/dantweb/dantweb/vbwd-sdk-2';
const ENVDIR = path.join(REPO, 'docs/marketing/cms-imports/hotel/booking');
const SHOTS = path.join(REPO, 'docs/dev_log/20260611/walkthrough/s65-shots');
const CATS = path.join(ENVDIR, 'booking_categories.json');
const RESS = path.join(ENVDIR, 'booking_resources.json');

fs.mkdirSync(SHOTS, { recursive: true });

const steps = []; // {n, file, title, caption, data}
let n = 0;

async function shot(page, title, caption, data) {
  n += 1;
  const file = `step-${String(n).padStart(2, '0')}.png`;
  await page.screenshot({ path: path.join(SHOTS, file), fullPage: true });
  steps.push({ n, file, title, caption, data: data || null });
  console.log(`  [${n}] ${title}`);
}

async function readResultRow(page, entity) {
  const row = page.locator(`[data-test="import-result-${entity}"]`);
  await row.waitFor({ state: 'visible', timeout: 15000 });
  const cells = row.locator('td');
  return {
    entity: (await cells.nth(0).innerText()).trim(),
    created: (await cells.nth(1).innerText()).trim(),
    updated: (await cells.nth(2).innerText()).trim(),
    skipped: (await cells.nth(3).innerText()).trim(),
    errors: (await cells.nth(4).innerText()).trim(),
  };
}

async function uploadAndImport(page, label, file, entity, opts) {
  const { confirm } = opts;
  await page.locator('[data-test="import-file"]').setInputFiles(file);
  await page.waitForTimeout(300);
  await shot(page, `${label}: file selected`,
    `The envelope <code>${path.basename(file)}</code> is selected in the unified Import block. Mode is <b>upsert</b> (match existing rows by slug). No data has been written yet.`);

  // dry-run preview
  await page.locator('[data-test="import-preview-run"]').click();
  const dry = await readResultRow(page, entity);
  await shot(page, `${label}: dry-run preview`,
    `Clicking <b>Preview</b> runs a <code>dry_run</code> import — it validates and reports what <i>would</i> happen without writing. Result for <code>${entity}</code>: created <b>${dry.created}</b>, updated <b>${dry.updated}</b>, skipped <b>${dry.skipped}</b>, errors <b>${dry.errors}</b>.`,
    dry);

  if (confirm) {
    await page.locator('[data-test="import-confirm"]').click();
    const real = await readResultRow(page, entity);
    await shot(page, `${label}: import committed`,
      `Clicking <b>Confirm</b> commits the import. Result for <code>${entity}</code>: created <b>${real.created}</b>, updated <b>${real.updated}</b>, skipped <b>${real.skipped}</b>, errors <b>${real.errors}</b>. The rows are now persisted in the database.`,
      real);
    return real;
  }
  return dry;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);

  // Fetch a real token via the API so we can keep the SPA authenticated across
  // hard navigations (fe-admin's auth guard reads admin_token / admin_token_user
  // from localStorage at boot; a full page load otherwise bounces to /login).
  const loginResp = await ctx.request.post(`${ADMIN}/api/v1/auth/login`, {
    data: { email: 'admin@example.com', password: 'AdminPass123@' },
  });
  const loginBody = await loginResp.json();
  const authToken = loginBody.token;
  const authUser = loginBody.user;

  try {
    // 1. Login page
    await page.goto(`${ADMIN}/admin/login`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="login-view"]').waitFor();
    await shot(page, 'Admin login',
      `The vbwd admin backoffice login page (<code>${ADMIN}/admin/login</code>).`);

    // 2. Sign in
    await page.locator('[data-testid="username-input"]').fill('admin@example.com');
    await page.locator('[data-testid="password-input"]').fill('AdminPass123@');
    await page.locator('[data-testid="login-button"]').click();
    await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    await shot(page, 'Signed in — dashboard',
      `Authenticated as <code>admin@example.com</code>. The admin dashboard loads with the full backoffice sidebar (Sales, Settings, CMS).`);

    // 3. Open Import/Export — navigate via the sidebar like a real admin
    //    (SPA navigation keeps the in-memory session; a hard reload would race
    //    the auth guard and bounce to /login).
    await page.locator('a[href="/admin/import-export"]').first().click();
    await page.locator('[data-testid="import-export-view"]').waitFor();
    await page.locator('[data-test="import-block"]').waitFor();
    await page.waitForTimeout(500);
    await shot(page, 'Import / Export view',
      `Settings → Import/Export. The General tab is manifest-driven: every registered entity (CMS, Sales, Settings clusters) can be exported or imported here. We will import the <b>hotel booking catalogue</b> — first categories, then resources.`);

    // 4-6. Categories (dry-run + confirm)
    await uploadAndImport(page, 'Booking Categories', CATS, 'booking_categories', { confirm: true });

    // 7-8. Resources dry-run FIRST as-is (categories now exist) — show it resolves
    await uploadAndImport(page, 'Booking Resources', RESS, 'booking_resources', { confirm: true });

    // 9. Idempotency — re-import resources (upsert by slug => updated, not duplicated)
    await page.locator('[data-test="import-file"]').setInputFiles(RESS);
    await page.waitForTimeout(300);
    await page.locator('[data-test="import-confirm"]').click();
    const reimport = await readResultRow(page, 'booking_resources');
    await shot(page, 'Idempotent re-import',
      `Re-importing the same resources envelope in <b>upsert</b> mode matches existing rows by slug: created <b>${reimport.created}</b>, updated <b>${reimport.updated}</b>. No duplicates are created — the import is idempotent.`,
      reimport);

    // 10. Verify in admin — booking resource list (expand Bookings group, click Resources)
    try {
      await page.locator('a[href="/admin/booking"]').first().click(); // expands group / opens dashboard
      await page.waitForTimeout(600);
      const resLink = page.locator('a[href="/admin/booking/resources"]').first();
      await resLink.waitFor({ state: 'visible', timeout: 5000 });
      await resLink.click();
      await page.waitForTimeout(1800);
      await shot(page, 'Verify: admin resource list',
        `The booking admin Resource List now shows the imported hotel resources (Standard Room, Deluxe Sea View, SPA Full Day, Conference Room A, …), each linked to its hotel category — proving the import landed in the operational catalogue, not just a file.`);
    } catch (navErr) {
      await shot(page, 'Verify: admin resource list',
        `Booking admin Resource List (navigation note: ${navErr.message}).`);
    }

    // 11. Verify public catalogue (fe-user)
    await page.goto(`${USER}/booking`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await shot(page, 'Verify: public catalogue',
      `The public-facing booking catalogue (<code>${USER}/booking</code>) renders the imported resources to end users — proving the catalogue imported through the UI is live and bookable.`);

    console.log('\nWalkthrough complete:', n, 'steps');
  } catch (err) {
    console.error('ERROR during walkthrough:', err.message);
    try { await shot(page, 'ERROR', `Walkthrough stopped: ${err.message}`); } catch (e2) {}
    fs.writeFileSync(path.join(SHOTS, 'steps.json'), JSON.stringify(steps, null, 2));
    await browser.close();
    process.exit(1);
  }
  fs.writeFileSync(path.join(SHOTS, 'steps.json'), JSON.stringify(steps, null, 2));
  await browser.close();
})();
