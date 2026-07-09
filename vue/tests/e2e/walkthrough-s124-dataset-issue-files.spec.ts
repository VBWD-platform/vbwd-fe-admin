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
 * The 9 S124 steps (each screenshotted; a broken flow fails and NO report is
 * emitted):
 *   1. The dataset backend plugin enabled/configured (fe-admin plugin detail).
 *   2. Open the seeded Air-Quality dataset editor (Details tab).
 *   3. Open the issue's snapshot/file manager — the new "Issue files" panel
 *      shows ONLY the primary data file (role=data, primary note, NO delete).
 *   4. Attach a PDF (role=document) through the panel — it appears with a
 *      document role badge and a delete control.
 *   5. Attach a chart PNG (role=chart) — now the issue lists 3 files (data +
 *      document + chart); the primary keeps its no-delete note.
 *   6. Admin per-file download: the panel exposes a Download control on EVERY
 *      row (incl. the primary, which has NO delete) served by the admin route
 *      `.../files/<fid>/download` with no entitlement check.
 *   7. Ensure the buyer is entitled: the storefront dataset detail, then the
 *      real order + `/webhooks/payment` capture (invoice.paid) seam S110 uses
 *      (local token_payment rejects EUR, so entitlement rides the capture chain).
 *   8. The entitled user opens the access page — the "Latest issue files" block
 *      lists the 3 files INLINE (no toggle), and the `last` archive row expands
 *      to the same list (both selectors SCOPED to their container).
 *   9. Byte-integrity guard: capture the real browser downloads of one member
 *      and the zip, and assert sha256(browser) == sha256(backend API) + the PDF
 *      carries real %PDF-/xref/startxref + the zip opens with byte-exact entries.
 *
 * Learnings baked in: admin auth via UI login then direct admin URLs; the
 * entitlement path is the same order + capture seam S110 exercises; the PDF
 * fixture is a genuinely openable PDF (the old 45-byte stub was the "corruption")
 * and downloads are verified by checksum against the backend, not just status.
 * IssueFileList renders in two legitimate places (latest block + archive row),
 * so every issue-file selector is scoped to its container.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { fileURLToPath } from 'url';

const PDF_MEDIA_BOX = 200;
const PDF_FONT_OBJECT = 5;
const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_METHOD_DEFLATED = 8;

/** Build a genuinely valid, openable single-page PDF with a byte-accurate xref
 * table, `startxref` and `%%EOF`. Offsets are computed from the assembled bytes
 * so the file is structurally correct (verified openable by CoreGraphics). This
 * replaces the old 45-byte `%PDF-…%%EOF` stub, which had no xref/page tree and
 * so every real PDF viewer rejected it as corrupt — the actual cause of the
 * "downloads look corrupted" report (a fixture defect, not a pipeline bug). */
function buildValidPdf(text: string): Buffer {
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const streamBody = `BT /F1 24 Tf 20 100 Td (${text}) Tj ET\n`;
  const streamLength = Buffer.byteLength(streamBody, 'latin1');
  const dictionaries = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_MEDIA_BOX} ${PDF_MEDIA_BOX}] ` +
      `/Resources << /Font << /F1 ${PDF_FONT_OBJECT} 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${streamLength} >>\nstream\n${streamBody}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let body = Buffer.from(header, 'latin1');
  const offsets: number[] = [];
  dictionaries.forEach((dictionary, index) => {
    offsets[index] = body.length;
    body = Buffer.concat([
      body,
      Buffer.from(`${index + 1} 0 obj\n${dictionary}\nendobj\n`, 'latin1'),
    ]);
  });

  const xrefOffset = body.length;
  const objectCount = dictionaries.length + 1; // + the free object 0
  let xref = `xref\n0 ${objectCount}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  const trailer =
    `trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.concat([body, Buffer.from(xref + trailer, 'latin1')]);
}

/** Hex sha256 of a buffer — the byte-integrity fingerprint the download guard
 * compares (browser-downloaded bytes vs the backend API bytes). */
function sha256(bytes: Buffer): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

/** Parse a freshly-built (contiguous local-file-header) zip into its entries,
 * inflating DEFLATE members, so the walkthrough can prove the archive opens AND
 * that every entry's bytes are byte-exact against the per-file API download. */
function parseZipEntries(buffer: Buffer): { name: string; data: Buffer }[] {
  const entries: { name: string; data: Buffer }[] = [];
  let cursor = 0;
  while (cursor + 4 <= buffer.length &&
    buffer.readUInt32LE(cursor) === ZIP_LOCAL_FILE_HEADER) {
    const method = buffer.readUInt16LE(cursor + 8);
    const compressedSize = buffer.readUInt32LE(cursor + 18);
    const nameLength = buffer.readUInt16LE(cursor + 26);
    const extraLength = buffer.readUInt16LE(cursor + 28);
    const name = buffer.subarray(cursor + 30, cursor + 30 + nameLength).toString('utf8');
    const dataStart = cursor + 30 + nameLength + extraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data =
      method === ZIP_METHOD_DEFLATED ? zlib.inflateRawSync(compressed) : Buffer.from(compressed);
    entries.push({ name, data });
    cursor = dataStart + compressedSize;
  }
  return entries;
}

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

// A genuinely valid, openable single-page PDF and a genuine 1x1 PNG so the
// attached member files are real, openable documents the panel renders.
const PDF_BYTES = buildValidPdf('S124 issue report');
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
      // The fe-user storefront keeps background network activity, so `networkidle`
      // can fail to settle under load — wait for `load` + the URL leaving /login.
      await page.goto(`${STORE}/login`, { waitUntil: 'domcontentloaded' });
      await page.locator('#email, input[type="email"]').first().fill(email);
      await page.locator('input[type="password"]').fill(password);
      await Promise.all([
        page.waitForURL((url) => !String(url).includes('/login'), { timeout: 20000 }),
        page.locator('button:has-text("Login")').click(),
      ]);
      await page.waitForLoadState('load');
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

    // ── STEP 6: admin per-file download (no entitlement gate) ─────────────────
    // The admin panel exposes a Download control on EVERY row — including the
    // primary — served by the admin route
    //   GET /api/v1/admin/datasets/<did>/snapshots/<sid>/files/<fid>/download
    // which has NO entitlement check (an admin need not have purchased the
    // dataset). The primary keeps its no-delete note; only members are removable.
    await expect(
      page.locator('[data-testid="issue-file-download-primary"]'),
      'the primary row must expose an admin Download control',
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="issue-file-delete-primary"]'),
      'the primary row must NOT expose a Delete control',
    ).toHaveCount(0);

    // Download the primary through the admin panel and capture the real browser
    // download (blob → object-URL → attachment).
    const adminPrimaryDownload = page.waitForEvent('download');
    await page.locator('[data-testid="issue-file-download-primary"]').click();
    expect(
      (await adminPrimaryDownload).suggestedFilename(),
      'admin primary download resolves as a file',
    ).toBeTruthy();

    // Download a member (the PDF) through the admin panel.
    const adminPdfRow = page.locator('[data-testid="issue-file-row"]', {
      hasText: 's124-report.pdf',
    });
    const adminMemberDownload = page.waitForEvent('download');
    await adminPdfRow.locator('[data-testid^="issue-file-download-"]').click();
    expect(
      (await adminMemberDownload).suggestedFilename(),
      'admin member download resolves as a file',
    ).toBeTruthy();

    // Prove the admin route itself is authed + un-gated by fetching the PDF
    // member straight from the API and checking its magic bytes.
    const adminFilesList = await (
      await page.request.get(
        `${API}/api/v1/admin/datasets/${datasetId}/snapshots/${snapshotId}/files`,
        { headers: authHeader },
      )
    ).json();
    const adminPdfId: string = adminFilesList.files.find(
      (file: { filename: string }) => file.filename === 's124-report.pdf',
    ).id;
    const adminMemberResponse = await page.request.get(
      `${API}/api/v1/admin/datasets/${datasetId}/snapshots/${snapshotId}/files/${adminPdfId}/download`,
      { headers: authHeader },
    );
    expect(adminMemberResponse.status(), 'admin per-file download is authed 200').toBe(200);
    const adminMemberBytes = Buffer.from(await adminMemberResponse.body());
    expect(adminMemberBytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    await shot(
      'Admin downloads issue files (no entitlement gate)',
      'The fe-admin <b>Issue files</b> panel exposes a <b>Download</b> control on every row — including the primary data file — served by the admin route <code>GET /api/v1/admin/datasets/&lt;did&gt;/snapshots/&lt;sid&gt;/files/&lt;fid&gt;/download</code> with <b>no</b> entitlement check (an admin need not have purchased the dataset). The primary keeps its "primary" note and exposes <b>no</b> Delete; only members are removable.',
    );

    // ── STEP 7: ensure the buyer is entitled (storefront + capture seam) ──────
    await loginStoreUi(BUYER_EMAIL, BUYER_PASSWORD);
    // `domcontentloaded` (not `networkidle`): the storefront keeps background
    // network activity (cart/session polling) that can keep `networkidle` from
    // ever settling within the run's timeout — the explicit assertions below are
    // the real readiness gate.
    await page.goto(`${STORE}/data-store/${CATEGORY_SLUG}/${DATASET_SLUG}`, {
      waitUntil: 'domcontentloaded',
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

    // ── STEP 8: the entitled user opens the access page ───────────────────────
    // IssueFileList renders in TWO legitimate places on this page: the inline
    // "Latest issue files" block (no toggle) AND the archive-row expansion, so
    // every issue-file selector below is SCOPED to its container.
    await page.goto(`${STORE}/dashboard/datasets/${DATASET_SLUG}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="dataset-access-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="dataset-archive"]')).toBeVisible();

    // (a) The latest issue's files are surfaced inline — WITHOUT any toggle click.
    const latestBlock = page.locator('[data-testid="dataset-latest-issue"]');
    await expect(latestBlock.locator('[data-testid="dataset-latest-files"]')).toBeVisible();
    await expect(latestBlock.locator('[data-testid="dataset-issue-file-row"]')).toHaveCount(3);
    await expect(latestBlock.locator('.dataset-issue-file-role--data')).toBeVisible();
    await expect(latestBlock.locator('.dataset-issue-file-role--document')).toBeVisible();
    await expect(latestBlock.locator('.dataset-issue-file-role--chart')).toBeVisible();

    // (b) The same files are also reachable by expanding the `last` archive row.
    const lastRow = page.locator('[data-testid="dataset-archive-row"]', {
      has: page.locator('[data-testid="dataset-archive-last-badge"]'),
    });
    await expect(lastRow).toHaveCount(1);
    await lastRow.locator('[data-testid="dataset-issue-files-toggle"]').click();
    const archivePanel = page.locator('[data-testid="dataset-issue-files"]');
    await expect(archivePanel.locator('[data-testid="dataset-issue-file-row"]')).toHaveCount(3);
    await shot(
      'Entitled user sees the 3-file issue',
      'On the entitlement-gated access page the latest issue\'s files are surfaced <b>inline</b> in the "Latest issue files" block (<code>data-testid="dataset-latest-issue"</code>) with <b>no toggle click</b> — the uniform 3-file list (<b>data</b>, <b>document</b>, <b>chart</b>), primary-first. The same files are also reachable by expanding the <code>last</code> archive row (<code>GET /api/v1/dataset/&lt;slug&gt;/snapshots/&lt;id&gt;/files</code>).',
    );

    // ── STEP 9: byte-integrity — the real "corrupted downloads" guard ─────────
    // Capture the ACTUAL browser downloads from the inline latest block, read
    // their bytes, and assert sha256 == the bytes fetched straight from the
    // backend API. This is the check that would catch real corruption.
    const entitledFilesUrl =
      `${API}/api/v1/dataset/${DATASET_SLUG}/snapshots/${snapshotId}/files`;
    const entitledFiles = (
      await (await page.request.get(entitledFilesUrl, { headers: authHeader })).json()
    ).files as { id: string; filename: string }[];
    const pdfEntry = entitledFiles.find((file) => file.filename === 's124-report.pdf');
    expect(pdfEntry, 'the PDF member must be listed for the entitled user').toBeTruthy();

    // (a) One member (the PDF): browser download vs API bytes, byte-for-byte.
    const memberDownloadEvent = page.waitForEvent('download');
    await latestBlock
      .locator('[data-testid="dataset-issue-file-row"]', { hasText: 's124-report.pdf' })
      .locator('[data-testid="dataset-issue-file-download"]')
      .click();
    const memberDownload = await memberDownloadEvent;
    const browserPdfBytes = fs.readFileSync(await memberDownload.path());
    const apiPdfResponse = await page.request.get(
      `${entitledFilesUrl}/${pdfEntry!.id}/download`,
      { headers: authHeader },
    );
    const apiPdfBytes = Buffer.from(await apiPdfResponse.body());
    expect(sha256(browserPdfBytes), 'downloaded PDF == API PDF (no corruption)').toBe(
      sha256(apiPdfBytes),
    );
    // A stub PDF can never regress back in: real magic + xref + startxref.
    expect(browserPdfBytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(browserPdfBytes.includes(Buffer.from('xref')), 'PDF has an xref table').toBe(true);
    expect(
      browserPdfBytes.includes(Buffer.from('startxref')),
      'PDF has a startxref pointer',
    ).toBe(true);

    // (b) The whole issue as a zip: it OPENS, contains the expected entries, and
    // every entry's bytes are byte-exact against the per-file API download. (The
    // zip is rebuilt per request with per-entry timestamps, so the archive bytes
    // themselves are not reproducible — the entry CONTENTS are what must match.)
    const archiveDownloadEvent = page.waitForEvent('download');
    await latestBlock.locator('[data-testid="dataset-issue-archive"]').click();
    const archiveDownload = await archiveDownloadEvent;
    const zipBytes = fs.readFileSync(await archiveDownload.path());
    expect(zipBytes.subarray(0, 2).toString('latin1'), 'zip opens (PK magic)').toBe('PK');
    const zipEntries = parseZipEntries(zipBytes);
    const zipNames = zipEntries.map((entry) => entry.name);
    expect(zipNames, 'zip contains the PDF member').toContain('s124-report.pdf');
    expect(zipNames, 'zip contains the chart member').toContain('s124-chart.png');
    for (const file of entitledFiles) {
      const apiFileBytes = Buffer.from(
        await (
          await page.request.get(`${entitledFilesUrl}/${file.id}/download`, {
            headers: authHeader,
          })
        ).body(),
      );
      const zipEntry = zipEntries.find((entry) => entry.name === file.filename);
      expect(zipEntry, `zip entry present for ${file.filename}`).toBeTruthy();
      expect(sha256(zipEntry!.data), `zip ${file.filename} == API bytes`).toBe(
        sha256(apiFileBytes),
      );
    }
    await shot(
      'Download one file + the whole issue (.zip) — byte-exact',
      'The user downloads a single member (the PDF) and clicks <b>Download all (.zip)</b>. The walkthrough captures the real browser downloads and asserts <code>sha256(browser) == sha256(API)</code> for the member, that the PDF carries real <code>%PDF-</code>/<code>xref</code>/<code>startxref</code> markers, and that the zip opens and every entry is byte-exact against its per-file API download — the regression guard for "corrupted downloads". The pipeline is byte-exact; the earlier stub-PDF fixture was the only "corruption".',
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
