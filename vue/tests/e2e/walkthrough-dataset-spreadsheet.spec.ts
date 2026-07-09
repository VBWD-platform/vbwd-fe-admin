/**
 * Walkthrough: dataset detail → Dataset tab → click a snapshot row → the
 * paginated spreadsheet page (classic functionality: header, scroll, Prev/Next,
 * page-size, row range). Captures one screenshot per step.
 *
 * Run against the LIVE stack:
 *   WALKTHROUGH_SHOTS=/abs/shots E2E_BASE_URL=http://localhost:8081 \
 *   npx playwright test walkthrough-dataset-spreadsheet --project=chromium
 *
 * Data note: the pager only renders in the read-only OVERSIZED mode — a snapshot
 * at or below `EDIT_SIZE_CAP` (2 MiB) loads whole in the editable grid and has no
 * pager. The seeded `air-quality` snapshots are a few hundred bytes, so this spec
 * SEEDS a >2 MiB CSV snapshot through the admin API (never raw SQL), exercises
 * the pager against it, and restores the dataset's `last` pointer so the shared
 * fixture is left untouched for the sibling walkthroughs. The former hardcoded
 * dataset id (14463d41-…) was stale (that dataset no longer exists) — the id is
 * now resolved dynamically from the seeded `air-quality` dataset.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN = process.env.E2E_BASE_URL || 'http://localhost:8081';
const API = process.env.API_URL || 'http://localhost:5000';
const SHOTS = process.env.WALKTHROUGH_SHOTS || '';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'AdminPass123@';
const DATASET_SLUG = 'air-quality';

// A distinctive, far-future taken_at marks the seeded oversized snapshot so the
// setup can find + purge it on re-run (idempotent) without touching real issues.
const OVERSIZED_TAKEN_AT = '2999-12-31-23-59';
// The pager renders only above EDIT_SIZE_CAP (2 MiB); ~2.6 MiB clears it safely.
const OVERSIZED_ROW_COUNT = 45000;

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

/** A valid CSV comfortably larger than the 2 MiB edit cap so the snapshot page
 * enters the read-only paginated mode the pager lives in. */
function buildOversizedCsv(rowCount: number): string {
  const lines = ['station,city,metric,value,unit,ts'];
  for (let index = 0; index < rowCount; index += 1) {
    const value = (12.3 + (index % 100) * 0.01).toFixed(3);
    lines.push(`DE-XX-${String(index).padStart(5, '0')},Berlin,PM2.5,${value},ug/m3,2026-07-01T09:00:00Z`);
  }
  return `${lines.join('\n')}\n`;
}

test('dataset → snapshot row → paginated spreadsheet', async ({ page }) => {
  page.setViewportSize({ width: 1440, height: 900 });

  // ── Setup (API): resolve the dataset, purge any prior seeded oversized
  //    snapshot, seed a fresh >2 MiB one, then restore `last` so the shared
  //    fixture is untouched. Seeding rides the admin snapshot API — never raw
  //    SQL — so it runs clean local AND in CI from a cold start. ─────────────
  const adminLogin = await page.request.post(`${API}/api/v1/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const adminToken: string = (await adminLogin.json()).token;
  const authHeader = { Authorization: `Bearer ${adminToken}` };

  const datasetList = await page.request.get(`${API}/api/v1/admin/datasets?per_page=50`, {
    headers: authHeader,
  });
  const datasetRow = (await datasetList.json()).items.find(
    (item: { slug: string }) => item.slug === DATASET_SLUG,
  );
  expect(datasetRow, 'the seeded air-quality dataset must exist').toBeTruthy();
  const datasetId: string = datasetRow.id;

  const snapshotsUrl = `${API}/api/v1/admin/datasets/${datasetId}/snapshots`;
  const priorSnapshots = (
    await (await page.request.get(snapshotsUrl, { headers: authHeader })).json()
  ).items as { id: string; taken_at: string }[];
  // The restore target is the newest REAL (non-marker) snapshot — robust even if
  // a failed prior run left `last` pointing at a since-deleted marker.
  const restoreTargetId = priorSnapshots.find(
    (snapshot) => snapshot.taken_at !== OVERSIZED_TAKEN_AT,
  )?.id;
  for (const snapshot of priorSnapshots) {
    if (snapshot.taken_at === OVERSIZED_TAKEN_AT) {
      await page.request.delete(`${snapshotsUrl}/${snapshot.id}`, { headers: authHeader });
    }
  }

  const seedResponse = await page.request.post(snapshotsUrl, {
    headers: authHeader,
    data: {
      content: buildOversizedCsv(OVERSIZED_ROW_COUNT),
      ext: 'csv',
      taken_at: OVERSIZED_TAKEN_AT,
    },
  });
  expect(seedResponse.status(), 'seeding the oversized snapshot must succeed (201)').toBe(201);
  const seededSnapshot = await seedResponse.json();
  expect(
    seededSnapshot.size_bytes,
    'the seeded snapshot must exceed the 2 MiB edit cap so the pager renders',
  ).toBeGreaterThan(2 * 1024 * 1024);
  // Seeding advanced `last` to the giant — restore it so sibling walkthroughs
  // that resolve the real `last` issue are unaffected.
  if (restoreTargetId) {
    await page.request.post(`${snapshotsUrl}/${restoreTargetId}/set-last`, { headers: authHeader });
  }

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
  await page.goto(`${ADMIN}/admin/datasets/${datasetId}`, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="dataset-tab-archive"]').click();
  await expect(page.locator('[data-testid="snapshot-archive"]')).toBeVisible();
  // The seeded oversized snapshot's row is identified by its distinctive
  // far-future taken_at (it sorts first under the newest-first ordering).
  const oversizedRow = page.locator('[data-testid="snapshot-row"]', {
    hasText: OVERSIZED_TAKEN_AT,
  });
  await expect(oversizedRow).toBeVisible();
  await shot(page, 'dataset-tab-archive');

  // 3. Click the oversized snapshot row → the paginated spreadsheet page.
  await Promise.all([
    page.waitForURL((url) => String(url).includes('/snapshots/'), { timeout: 20000 }),
    oversizedRow.click(),
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
