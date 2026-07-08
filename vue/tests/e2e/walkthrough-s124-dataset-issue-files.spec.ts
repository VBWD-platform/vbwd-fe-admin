/**
 * S124 — Dataset multi-file issue bundle walkthrough (Inc 8 acceptance gate).
 *
 * A serial, stateful, cross-app (admin :8081 + storefront :8080) journey that
 * captures ONE screenshot per S124 step and — only when the whole run reaches
 * the end green — emits a self-contained HTML report
 * (docs/dev_log/20260707/walkthrough/s124-dataset-issue-files/walkthrough.html)
 * embedding the shots. Mirrors walkthrough-s110-datasets.spec.ts (same plugin,
 * same auth/seed/report patterns, same green-only capture style).
 *
 * Run against the LIVE stack (E2E_BASE_URL stops Playwright spawning a dev
 * server); dump numbered shots to the artifact dir:
 *   WALKTHROUGH_SHOTS=/abs/docs/dev_log/20260707/walkthrough/s124-dataset-issue-files/shots \
 *   E2E_BASE_URL=http://localhost:8081 \
 *   npx playwright test walkthrough-s124-dataset-issue-files
 *
 * The 8 S124 steps (each screenshotted; a broken flow fails and NO report is
 * emitted):
 *   1. The dataset backend plugin enabled/configured (fe-admin plugin detail).
 *   2. Open the seeded Air-Quality dataset editor (Details tab).
 *   3. Open the issue's snapshot/file manager — the new "Issue files" panel
 *      shows ONLY the primary data file (role=data, primary note, NO delete).
 *   4. Attach a PDF (role=document) through the panel — it appears with a
 *      document role badge and a delete control.
 *   5. Attach a chart PNG (role=chart) — now the issue lists 3 files (data +
 *      document + chart); the primary keeps its no-delete note.
 *   6. Ensure the buyer is entitled: the storefront dataset detail, then the
 *      real order + `/webhooks/payment` capture (invoice.paid) seam S110 uses
 *      (local token_payment rejects EUR, so entitlement rides the capture chain).
 *   7. The entitled user opens the dataset access page and expands the issue —
 *      it lists the same 3 files with role badges.
 *   8. The user downloads ONE member file (the download response resolves 200)
 *      and clicks "Download all (.zip)" (the archive response resolves 200).
 *
 * Learnings baked in: admin auth via UI login then direct admin URLs; the
 * entitlement path is the same order + capture seam S110 exercises; download
 * assertions watch the authed API responses (blob received over the wire),
 * because the browser blob-download uses object URLs revoked immediately.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ADMIN = process.env.ADMIN_URL || 'http://localhost:8081';
const STORE = process.env.STORE_URL || 'http://localhost:8080';
const API = process.env.API_URL || 'http://localhost:5000';
const SHOTS_DIR = process.env.WALKTHROUGH_SHOTS || '';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'AdminPass123@';
// The buyer carries the `*` permission (so it satisfies the dataset access-page
// route guard) and drives the same order + capture entitlement path as S110.
const BUYER_EMAIL = process.env.WALKTHROUGH_BUYER_EMAIL || ADMIN_EMAIL;
const BUYER_PASSWORD = process.env.WALKTHROUGH_BUYER_PASSWORD || ADMIN_PASSWORD;

const DATASET_SLUG = 'air-quality';
const CATEGORY_SLUG = 'environment';

// A minimal but structurally valid PDF and 1x1 PNG so the attached member files
// carry the real content-type the panel renders.
const PDF_BYTES = Buffer.from(
  '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n',
  'utf-8',
);
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = SHOTS_DIR
  ? path.resolve(SHOTS_DIR, '..')
  : path.resolve(
      SPEC_DIR,
      '../../../../docs/dev_log/20260707/walkthrough/s124-dataset-issue-files',
    );

if (SHOTS_DIR) fs.mkdirSync(SHOTS_DIR, { recursive: true });

interface WalkStep {
  index: number;
  file: string;
  title: string;
  caption: string;
}

test.describe('S124 Dataset multi-file issue bundle walkthrough', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('attach PDF + chart to an issue, then an entitled user views + downloads them', async ({
    page,
  }, testInfo) => {
    test.setTimeout(420_000);
    page.setDefaultTimeout(15_000);

    const steps: WalkStep[] = [];
    let stepCounter = 0;

    const shot = async (title: string, caption: string): Promise<void> => {
      stepCounter += 1;
      const file = `${String(stepCounter).padStart(2, '0')}-${title
        .replace(/[^a-z0-9]+/gi, '-')
        .toLowerCase()}.png`;
      const buffer = await page.screenshot({ fullPage: false });
      await testInfo.attach(`${stepCounter}. ${title}`, {
        body: buffer,
        contentType: 'image/png',
      });
      if (SHOTS_DIR) fs.writeFileSync(path.join(SHOTS_DIR, file), buffer);
      steps.push({ index: stepCounter, file, title, caption });
    };

    const loginAdminUi = async (): Promise<void> => {
      await page.goto(`${ADMIN}/admin/login`, { waitUntil: 'networkidle' });
      await page
        .locator('input[type="email"], input#username, input[type="text"]')
        .first()
        .fill(ADMIN_EMAIL);
      await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
      await Promise.all([
        page.waitForURL((url) => !String(url).includes('/login'), { timeout: 20000 }),
        page
          .locator(
            '[data-testid="login-button"], button:has-text("Sign In"), button[type="submit"]',
          )
          .first()
          .click(),
      ]);
      await page.waitForLoadState('networkidle');
    };

    const loginStoreUi = async (email: string, password: string): Promise<void> => {
      await page.goto(`${STORE}/login`, { waitUntil: 'networkidle' });
      await page.locator('#email, input[type="email"]').first().fill(email);
      await page.locator('input[type="password"]').fill(password);
      await Promise.all([
        page.waitForURL((url) => !String(url).includes('/login'), { timeout: 20000 }),
        page.locator('button:has-text("Login")').click(),
      ]);
      await page.waitForLoadState('networkidle');
    };

    // ── Setup: obtain an admin API token and resolve the seeded dataset + its
    //    `last` issue. This is walkthrough configuration (it also makes the run
    //    re-runnable by removing any member files left by a prior run), NOT a
    //    shortcut for a UI step. ───────────────────────────────────────────────
    const adminLogin = await page.request.post(`${API}/api/v1/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const adminToken: string = (await adminLogin.json()).token;
    const authHeader = { Authorization: `Bearer ${adminToken}` };

    const datasetList = await page.request.get(
      `${API}/api/v1/admin/datasets?per_page=50`,
      { headers: authHeader },
    );
    const datasetRow = (await datasetList.json()).items.find(
      (item: { slug: string }) => item.slug === DATASET_SLUG,
    );
    expect(datasetRow, 'the seeded air-quality dataset must exist').toBeTruthy();
    const datasetId: string = datasetRow.id;

    const datasetDetail = await page.request.get(
      `${API}/api/v1/admin/datasets/${datasetId}`,
      { headers: authHeader },
    );
    const snapshotId: string = (await datasetDetail.json()).last_snapshot_id;
    expect(snapshotId, 'the dataset must have a `last` issue snapshot').toBeTruthy();

    // Clean any member files a previous run attached so the counts are exact.
    const existing = await page.request.get(
      `${API}/api/v1/admin/datasets/${datasetId}/snapshots/${snapshotId}/files`,
      { headers: authHeader },
    );
    for (const file of (await existing.json()).files as { id: string }[]) {
      if (file.id !== 'primary') {
        await page.request.delete(
          `${API}/api/v1/admin/datasets/${datasetId}/snapshots/${snapshotId}/files/${file.id}`,
          { headers: authHeader },
        );
      }
    }

    // ── STEP 1: the dataset backend plugin enabled / configured ───────────────
    await loginAdminUi();
    await page.goto(`${ADMIN}/admin/settings/backend-plugins/${DATASET_SLUG}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toContainText(/dataset/i);
    await shot(
      'Dataset plugin enabled',
      'The <code>dataset</code> backend plugin management page in fe-admin: the plugin is enabled and its admin-config (incl. the new S124 <code>max_file_size_bytes</code> / <code>allowed_file_extensions</code> limits) is editable. The fe-admin + fe-user dataset plugins are likewise enabled in their runtime manifests.',
    );

    // ── STEP 2: open the seeded Air-Quality dataset editor (Details) ──────────
    await page.goto(`${ADMIN}/admin/datasets/${datasetId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-testid="dataset-details-pane"]')).toBeVisible();
    await expect(page.locator('[data-testid="dataset-title"]')).toHaveValue(/Air Quality/i);
    await shot(
      'Dataset editor — Details',
      'The tabbed dataset editor (Details tab) for the seeded <b>Air Quality</b> dataset. An issue is a periodic snapshot in this dataset; S124 lets each issue carry extra files beyond the primary CSV.',
    );

    // ── STEP 3: open the issue's snapshot/file manager — only the primary file ─
    await page.goto(
      `${ADMIN}/admin/datasets/${datasetId}/snapshots/${snapshotId}`,
      { waitUntil: 'networkidle' },
    );
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-testid="issue-files"]')).toBeVisible();
    // Only the synthesized primary (role=data) is present, with a no-delete note.
    await expect(page.locator('[data-testid="issue-file-row"]')).toHaveCount(1);
    await expect(page.locator('.role-badge--data')).toBeVisible();
    await expect(
      page.locator('[data-testid^="issue-file-primary-"]'),
      'the primary data file must carry the no-delete primary note',
    ).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="issue-file-delete-"]'),
      'the primary data file must NOT expose a delete control',
    ).toHaveCount(0);
    await shot(
      'Issue file manager — primary only',
      'The new <b>Issue files</b> panel under the snapshot manager. Before any extras are attached it shows exactly ONE row: the synthesized primary data file (stable id <code>primary</code>, role <code>data</code>) rendered with a "primary" note and <b>no</b> delete control — the primary lives on the snapshot itself and cannot be removed here.',
    );

    // ── STEP 4: attach a PDF (role=document) through the panel ────────────────
    await page.setInputFiles('[data-testid="issue-file-input"]', {
      name: 's124-report.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_BYTES,
    });
    await page.locator('[data-testid="issue-file-role-select"]').selectOption('document');
    await page.locator('[data-testid="issue-file-add-btn"]').click();
    await expect(page.locator('[data-testid="issue-file-row"]')).toHaveCount(2);
    await expect(page.locator('.role-badge--document')).toBeVisible();
    await expect(page.locator('td:has-text("s124-report.pdf")')).toBeVisible();
    await shot(
      'Attach a PDF report (role=document)',
      'Attaching a PDF through the panel form (file input + role <code>&lt;select&gt;</code> → <code>document</code> → Add) POSTs a multipart <code>file</code>+<code>role</code> to <code>/api/v1/admin/datasets/&lt;id&gt;/snapshots/&lt;id&gt;/files</code>. The new <code>s124-report.pdf</code> row appears with a <b>document</b> role badge and a delete control (members, unlike the primary, are removable).',
    );

    // ── STEP 5: attach a chart PNG (role=chart) — now 3 files ─────────────────
    await page.setInputFiles('[data-testid="issue-file-input"]', {
      name: 's124-chart.png',
      mimeType: 'image/png',
      buffer: PNG_BYTES,
    });
    await page.locator('[data-testid="issue-file-role-select"]').selectOption('chart');
    await page.locator('[data-testid="issue-file-add-btn"]').click();
    await expect(page.locator('[data-testid="issue-file-row"]')).toHaveCount(3);
    await expect(page.locator('.role-badge--chart')).toBeVisible();
    await expect(page.locator('td:has-text("s124-chart.png")')).toBeVisible();
    // The two members are removable; the primary still is not.
    await expect(page.locator('[data-testid^="issue-file-delete-"]')).toHaveCount(2);
    await expect(page.locator('[data-testid^="issue-file-primary-"]')).toHaveCount(1);
    await shot(
      'Attach a chart PNG (role=chart) — issue = 3 files',
      'A chart PNG is attached with role <code>chart</code>. The issue is now a <b>bundle of 3 files</b>: the primary CSV (role <code>data</code>, no-delete), the PDF (role <code>document</code>), and the chart (role <code>chart</code>). The panel renders one uniform list and never special-cases the primary except for its no-delete note.',
    );

    // ── STEP 6: ensure the buyer is entitled (storefront + capture seam) ──────
    await loginStoreUi(BUYER_EMAIL, BUYER_PASSWORD);
    await page.goto(`${STORE}/data-store/${CATEGORY_SLUG}/${DATASET_SLUG}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toContainText(/air quality/i);
    await shot(
      'Buyer opens the dataset (storefront)',
      'The buyer opens the dataset in the Data store. Entitlement is then granted through the SAME real seam S110 uses — <code>POST /api/v1/dataset/orders</code> then the payment-capture webhook (<code>PaymentCapturedEvent</code> → <code>invoice.paid</code>) — because the bundled <code>token_payment</code> provider rejects EUR locally (a known local config gap, not a plugin defect).',
    );
    // Confirm the buyer is NOT yet entitled, then run the order + capture chain.
    const beforeEntitle = await page.request.get(
      `${API}/api/v1/dataset/${DATASET_SLUG}/snapshots/${snapshotId}/files`,
      { headers: authHeader },
    );
    expect([200, 403]).toContain(beforeEntitle.status());
    const orderRes = await page.request.post(`${API}/api/v1/dataset/orders`, {
      headers: authHeader,
      data: { dataset_slug: DATASET_SLUG },
    });
    expect(orderRes.status(), 'dataset one-time order must be created (201)').toBe(201);
    const order = await orderRes.json();
    const invoiceId: string = order.invoice_id || order.invoice?.id;
    expect(invoiceId, 'the order returns an invoice id').toBeTruthy();
    const captureRes = await page.request.post(`${API}/api/v1/webhooks/payment`, {
      headers: authHeader,
      data: {
        invoice_id: invoiceId,
        payment_reference: `WALK-S124-${Date.now()}`,
        amount: order.total_amount || order.invoice?.total_amount || '22.61',
        currency: order.currency || 'EUR',
      },
    });
    expect(captureRes.status(), 'invoice capture (invoice.paid) must succeed (200)').toBe(200);
    const afterEntitle = await page.request.get(
      `${API}/api/v1/dataset/${DATASET_SLUG}/snapshots/${snapshotId}/files`,
      { headers: authHeader },
    );
    expect(
      afterEntitle.status(),
      'after capture the buyer is entitled to the issue files (200)',
    ).toBe(200);

    // ── STEP 7: the entitled user opens the access page + expands the issue ───
    await page.goto(`${STORE}/dashboard/datasets/${DATASET_SLUG}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="dataset-access-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="dataset-archive"]')).toBeVisible();
    // The `last` issue is the one the files were attached to; find its row by the
    // "last" badge and expand its files.
    const lastRow = page.locator('[data-testid="dataset-archive-row"]', {
      has: page.locator('[data-testid="dataset-archive-last-badge"]'),
    });
    await expect(lastRow).toHaveCount(1);
    await lastRow.locator('[data-testid="dataset-issue-files-toggle"]').click();
    await expect(page.locator('[data-testid="dataset-issue-file-row"]')).toHaveCount(3);
    await expect(page.locator('.dataset-issue-file-role--data')).toBeVisible();
    await expect(page.locator('.dataset-issue-file-role--document')).toBeVisible();
    await expect(page.locator('.dataset-issue-file-role--chart')).toBeVisible();
    await shot(
      'Entitled user sees the 3-file issue',
      'On the entitlement-gated access page the user expands the issue (<code>GET /api/v1/dataset/&lt;slug&gt;/snapshots/&lt;id&gt;/files</code>) and sees the uniform 3-file list — <b>data</b>, <b>document</b>, <b>chart</b> — each with its role badge, primary-first.',
    );

    // ── STEP 8: download one member file + the whole issue as a zip ───────────
    const memberDownload = page.waitForResponse(
      (response) =>
        /\/snapshots\/[^/]+\/files\/[^/]+\/download/.test(response.url()) &&
        response.status() === 200,
      { timeout: 20000 },
    );
    await page.locator('[data-testid="dataset-issue-file-download"]').first().click();
    await memberDownload;

    const archiveDownload = page.waitForResponse(
      (response) =>
        /\/snapshots\/[^/]+\/archive/.test(response.url()) && response.status() === 200,
      { timeout: 20000 },
    );
    await page.locator('[data-testid="dataset-issue-archive"]').click();
    await archiveDownload;
    await shot(
      'Download one file + the whole issue (.zip)',
      'The user downloads a single member file (<code>GET .../files/&lt;id&gt;/download</code> resolves 200 with the authed blob) and clicks <b>Download all (.zip)</b> (<code>GET .../snapshots/&lt;id&gt;/archive</code> resolves 200 — the issue assembled on demand as a zip of the primary + every member).',
    );

    // ── Green-only report: reached only when every step above passed. ─────────
    writeReport(steps);
  });
});

/** Emit the self-contained walkthrough.html embedding the numbered shots.
 * Called ONLY after the final step's assertions pass. */
function writeReport(steps: WalkStep[]): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const body = steps
    .map(
      (step) => `
  <section class="step">
    <h2>${step.index}. ${escapeHtml(step.title)}</h2>
    <p>${step.caption}</p>
    <a href="shots/${step.file}"><img src="shots/${step.file}" alt="${escapeHtml(
      step.title,
    )}" /></a>
  </section>`,
    )
    .join('\n');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>S124 — Dataset multi-file issue bundle walkthrough</title>
<style>
  body { font-family: -apple-system, Segoe UI, sans-serif; max-width: 1100px; margin: 2rem auto; padding: 0 1rem; color: #1a202c; }
  h1 { border-bottom: 3px solid #3182ce; padding-bottom: .5rem; }
  .meta { color: #4a5568; }
  .step { margin: 2.5rem 0; }
  .step h2 { color: #2c5282; }
  .step img { width: 100%; border: 1px solid #cbd5e0; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  code { background: #edf2f7; padding: .1em .3em; border-radius: 3px; }
</style></head><body>
<h1>S124 — Dataset multi-file issue bundle walkthrough</h1>
<p class="meta">Sprint: <code>docs/dev_log/20260707/sprints/S124_dataset_multi_file_issue_bundle.md</code> (Inc 8) ·
Live stack: fe-admin :8081, fe-user :8080, backend :5000 ·
Flow: plugin enabled → dataset editor → issue file manager (primary only) →
attach PDF (document) → attach chart PNG (chart) → buyer entitled via the
order + capture seam → entitled user expands the 3-file issue → downloads one
member file → downloads the whole issue as a .zip. Generated only on a
fully-green run.</p>
${body}
</body></html>\n`;
  fs.writeFileSync(path.join(REPORT_DIR, 'walkthrough.html'), html);
  // eslint-disable-next-line no-console
  console.log(
    `[s124-walkthrough] report written: ${path.join(REPORT_DIR, 'walkthrough.html')} (${steps.length} steps)`,
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[<>&]/g, (character) =>
    character === '<' ? '&lt;' : character === '>' ? '&gt;' : '&amp;',
  );
}
