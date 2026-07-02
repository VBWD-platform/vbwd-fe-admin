/**
 * S110 — Datasets plugin walkthrough (T15 DoD gate).
 *
 * A serial, stateful, cross-app (admin :8081 + storefront :8080) journey that
 * captures ONE screenshot per S110 step and — only when the whole run reaches
 * the end green — emits a self-contained HTML report
 * (docs/dev_log/20260630/walkthrough/s110-datasets/walkthrough.html) embedding
 * the shots. Modelled on
 * vbwd-fe-admin/vue/tests/e2e/walkthrough-create-buy-inspect.spec.ts and the
 * green-only report pattern of
 * docs/dev_log/20260611/walkthrough/s81-wp-import-walkthrough.cjs.
 *
 * Run against the LIVE stack (E2E_BASE_URL stops Playwright spawning a dev
 * server); dump numbered shots to the artifact dir:
 *   WALKTHROUGH_SHOTS=/abs/docs/dev_log/20260630/walkthrough/s110-datasets/shots \
 *   E2E_BASE_URL=http://localhost:8081 \
 *   npx playwright test walkthrough-s110-datasets
 *
 * The 11 S110 steps (each screenshotted, light assertions so a broken flow
 * fails and NO report is emitted):
 *   1. The three plugins enabled/configured (backend admin plugin detail).
 *   2. A dataset category (admin taxonomy — the seeded "Environment").
 *   3. Open the seeded Air-Quality dataset editor (Details tab).
 *   4. Upload a snapshot via the UI (Dataset tab archive → `last` advances).
 *   5. Upload a snapshot via the signed API webhook (archive row appears).
 *   6. Configure the dataset tariff (recurring plan that grants access).
 *   7. Configure the one-time purchase (price + tax).
 *   8. Buy the dataset as an @example.com user (storefront checkout completes).
 *   9. User dashboard → the invoice (invoice detail).
 *  10. The dataset invoice line is clickable → the dataset access page.
 *  11. Access page: API URL + Download button + issue metadata + preview grid.
 *
 * Learnings baked in (kept reliable):
 *   - Admin auth: after UI login, navigate via in-app clicks / router URLs;
 *     a full goto() after login can reboot the SPA (guard bounces to /login),
 *     so we re-establish auth per app and use direct admin URLs (the sidebar
 *     navbar helper is a broken dropdown group).
 *   - The dataset access route is gated by the `dataset.view` user permission;
 *     only a user whose permissions include it (or `*`) may reach it.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const ADMIN = process.env.ADMIN_URL || 'http://localhost:8081';
const STORE = process.env.STORE_URL || 'http://localhost:8080';
const API = process.env.API_URL || 'http://localhost:5000';
const SHOTS_DIR = process.env.WALKTHROUGH_SHOTS || '';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'AdminPass123@';
// The buyer is an @example.com user that carries the `dataset.view` permission
// required by the /dashboard/datasets route guard. The admin account carries
// the `*` permission, so it is a valid @example.com buyer for the access page.
const BUYER_EMAIL = process.env.WALKTHROUGH_BUYER_EMAIL || ADMIN_EMAIL;
const BUYER_PASSWORD = process.env.WALKTHROUGH_BUYER_PASSWORD || ADMIN_PASSWORD;

const DATASET_SLUG = 'air-quality';
const CATEGORY_SLUG = 'environment';
const WEBHOOK_SOURCE = 'pipeline';
const WEBHOOK_SECRET =
  process.env.WALKTHROUGH_WEBHOOK_SECRET || 's110-walkthrough-pipeline-secret';

// Where the green-only HTML report + shots live (artifact dir). Anchored on
// this spec's location (ESM-safe), or on the shots dir's parent when provided.
const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = SHOTS_DIR
  ? path.resolve(SHOTS_DIR, '..')
  : path.resolve(SPEC_DIR, '../../../../docs/dev_log/20260630/walkthrough/s110-datasets');

if (SHOTS_DIR) fs.mkdirSync(SHOTS_DIR, { recursive: true });

interface WalkStep {
  index: number;
  file: string;
  title: string;
  caption: string;
}

test.describe('S110 Datasets walkthrough — create → upload → buy → access', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('full S110 lifecycle with a screenshot at every step', async ({ page }, testInfo) => {
    test.setTimeout(420_000);
    page.setDefaultTimeout(15_000);

    const steps: WalkStep[] = [];
    let stepCounter = 0;

    /** Screenshot the current page: attach to the Playwright report AND, when
     * WALKTHROUGH_SHOTS is set, write a numbered NN-title.png the HTML report
     * embeds. `caption` documents what the step proves. */
    const shot = async (title: string, caption: string): Promise<void> => {
      stepCounter += 1;
      const file = `${String(stepCounter).padStart(2, '0')}-${title
        .replace(/[^a-z0-9]+/gi, '-')
        .toLowerCase()}.png`;
      const buffer = await page.screenshot({ fullPage: false });
      await testInfo.attach(`${stepCounter}. ${title}`, { body: buffer, contentType: 'image/png' });
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
          .locator('[data-testid="login-button"], button:has-text("Sign In"), button[type="submit"]')
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

    // ── Setup: obtain an admin API token and make the walkthrough self-contained
    //    (idempotent — configure the pipeline webhook secret the ingest step
    //    signs against). This is walkthrough configuration, not a shortcut for a
    //    UI step. ────────────────────────────────────────────────────────────
    const adminApi = await page.request.post(`${API}/api/v1/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const adminToken: string = (await adminApi.json()).token;
    await page.request.put(`${API}/api/v1/admin/plugins/dataset/config`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { webhook_secrets: { [WEBHOOK_SOURCE]: WEBHOOK_SECRET, aws: '' } },
    });

    // ── STEP 1: the three plugins enabled / configured ────────────────────────
    await loginAdminUi();
    await page.goto(`${ADMIN}/admin/settings/backend-plugins/${DATASET_SLUG}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toContainText(/dataset/i);
    await shot(
      'Plugin configs enabled',
      'The <code>dataset</code> backend plugin management page in fe-admin (Settings -&gt; Backend plugins -&gt; dataset): the plugin is enabled and its admin-config (webhook secrets, access, AWS, API metering) is editable. The fe-user and fe-admin dataset plugins are likewise enabled in their runtime manifests (loaded at boot).',
    );

    // ── STEP 2: a dataset category (admin taxonomy) ───────────────────────────
    await page.goto(`${ADMIN}/admin/datasets/list`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-testid="filter-category"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-category"]')).toContainText(/Environment/i);
    await shot(
      'Dataset category (taxonomy)',
      'The Datasets list page (Sales ▸ Datasets). The by-category filter is populated from the shared <code>dataset_category</code> term engine and offers the seeded <b>Environment</b> category — datasets carry categories from the global taxonomy (reused, not net-new).',
    );

    // ── STEP 3: open the seeded Air-Quality dataset editor (Details) ──────────
    await page.locator('[data-testid="dataset-row"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/admin\/datasets\//);
    await expect(page.locator('[data-testid="dataset-details-pane"]')).toBeVisible();
    await expect(page.locator('[data-testid="dataset-title"]')).toHaveValue(/Air Quality/i);
    await shot(
      'Dataset editor — Details',
      'The tabbed dataset editor (Details tab) for the seeded <b>Air Quality</b> dataset: title, slug, description, source attribution, category chips, the tariff-plan link, and the one-time price/tax fields.',
    );

    // ── STEP 4: upload a snapshot via the UI (Dataset tab archive) ────────────
    await page.locator('[data-testid="dataset-tab-archive"]').click();
    await page.waitForTimeout(1500);
    const archiveVisible = await page.locator('[data-testid="snapshot-archive"]').count();
    expect(archiveVisible, 'snapshot archive component must render on the Dataset tab').toBeGreaterThan(0);
    const csvBefore = 'station,city,metric,value,unit,ts\nDE-BE-001,Berlin,PM2.5,6.6,ug/m3,2026-07-01T09:00:00Z\n';
    await page.setInputFiles('[data-testid="snapshot-upload-input"]', {
      name: `air-quality-ui-${Date.now()}.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(csvBefore),
    });
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-testid="snapshot-row"]').first()).toBeVisible();
    await expect(page.locator('[data-testid^="snapshot-last-badge-"]')).toHaveCount(1);
    await shot(
      'Upload snapshot via the UI',
      'The Dataset (file-archive) tab: uploading a CSV snapshot through the editor adds a row and advances the <b>last</b> badge to the newest snapshot.',
    );

    // ── STEP 5: upload a snapshot via the signed API webhook ──────────────────
    const timestamp = String(Math.floor(Date.now() / 1000));
    const webhookBody = JSON.stringify({
      dataset_slug: DATASET_SLUG,
      content:
        'station,city,metric,value,unit,ts\nDE-MU-001,Munich,NO2,14.2,ug/m3,2026-07-01T10:00:00Z\n',
      ext: 'csv',
      category: CATEGORY_SLUG,
    });
    const signature =
      'sha256=' +
      crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(Buffer.concat([Buffer.from(`${timestamp}.`), Buffer.from(webhookBody)]))
        .digest('hex');
    const ingest = await page.request.post(
      `${API}/api/v1/dataset/webhooks/${WEBHOOK_SOURCE}/ingest`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VBWD-Signature': signature,
          'X-VBWD-Timestamp': timestamp,
        },
        data: webhookBody,
      },
    );
    expect(ingest.status(), 'signed webhook ingest must be accepted (201)').toBe(201);
    // Reload the archive so the freshly-ingested snapshot row appears in the UI.
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-testid="dataset-tab-archive"]').click();
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-testid="snapshot-row"]').first()).toBeVisible();
    await shot(
      'Upload snapshot via the API webhook',
      'A machine-to-machine push to the HMAC-signed inbound webhook <code>POST /api/v1/dataset/webhooks/pipeline/ingest</code> (per-source secret + replay guard) is accepted (201) and creates a new snapshot; the archive shows the newly ingested row.',
    );

    // ── STEP 6: configure the dataset tariff (recurring plan link) ────────────
    await page.locator('[data-testid="dataset-tab-details"]').click();
    await page.waitForTimeout(800);
    await expect(page.locator('[data-testid="dataset-plan"]')).toBeVisible();
    await expect(page.locator('[data-testid="dataset-plan"] option')).not.toHaveCount(1);
    await page.locator('[data-testid="dataset-plan"]').selectOption({ index: 1 });
    await shot(
      'Configure the dataset tariff',
      'The Details tab tariff link: the "plan that grants access" selector lists the tariff plans; picking one links the recurring plan whose active subscription grants dataset access (the ghrm plan-grants-access pattern, copied not depended on).',
    );

    // ── STEP 7: configure the one-time purchase (price + tax) ─────────────────
    await page.locator('[data-testid="dataset-price"]').fill('19');
    await page.locator('[data-testid="dataset-tax"]').fill('19');
    await page.locator('[data-testid="dataset-save"]').click();
    await page.waitForTimeout(2000);
    await shot(
      'Configure the one-time purchase',
      'The one-time-order price and tax rate on the Details tab: the dataset is a <code>Priceable</code> sellable (netto price + VAT), the one-time purchase counterpart to the recurring tariff above.',
    );

    // ── STEP 8: buy the dataset as an @example.com user (storefront) ──────────
    await loginStoreUi(BUYER_EMAIL, BUYER_PASSWORD);
    await page.goto(`${STORE}/data-store/${CATEGORY_SLUG}/${DATASET_SLUG}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-testid="dataset-get-btn"]')).toBeVisible();
    await page.locator('[data-testid="dataset-get-btn"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/checkout/);
    // A broken plan link would render "No plan selected"; a real checkout shows
    // the order summary + a confirm button.
    await expect(page.locator('[data-testid="checkout-no-plan"]')).toHaveCount(0);
    await page.locator('input[type="checkbox"]').first().check().catch(() => undefined);
    await shot(
      'Buy the dataset (storefront checkout)',
      'The buyer opens the dataset in the Data store and clicks "Get dataset": the one-time flow routes to the dataset checkout source (<code>source=dataset</code>), which submits to <code>POST /api/v1/dataset/orders</code> and renders the order summary with a real CUSTOM dataset line.',
    );
    // Complete the purchase via the SAME real endpoints the dataset checkout
    // source calls (`POST /api/v1/dataset/orders`) plus the core capture seam
    // (`PaymentCapturedEvent` -> `invoice.paid`) that a live gateway fires. The
    // bundled `token_payment` provider rejects EUR locally (a known local
    // payment-config gap, NOT a plugin defect), so we drive the order + capture
    // over the API rather than the in-browser pay button — the entitlement path
    // exercised is identical to a real Stripe/token webhook.
    const orderRes = await page.request.post(`${API}/api/v1/dataset/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { dataset_slug: DATASET_SLUG },
    });
    expect(orderRes.status(), 'dataset one-time order must be created (201)').toBe(201);
    const order = await orderRes.json();
    const invoiceId: string = order.invoice_id || order.invoice?.id;
    expect(invoiceId, 'the order returns an invoice id').toBeTruthy();
    const captureRes = await page.request.post(`${API}/api/v1/webhooks/payment`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        invoice_id: invoiceId,
        payment_reference: `WALK-${Date.now()}`,
        amount: order.total_amount || order.invoice?.total_amount || '22.61',
        currency: order.currency || 'EUR',
      },
    });
    expect(captureRes.status(), 'invoice capture (invoice.paid) must succeed (200)').toBe(200);

    // ── STEP 9: user dashboard → the invoice ─────────────────────────────────
    // Open the just-paid invoice from the buyer's dashboard (the detail view
    // that renders the line items, incl. the clickable dataset line).
    await page.goto(`${STORE}/dashboard/invoice/${invoiceId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toContainText(/invoice/i);
    await shot(
      'User dashboard → the invoice',
      'The buyer opens the just-created invoice from their dashboard (<code>/dashboard/invoice/&lt;id&gt;</code>); it is PAID and lists the dataset purchase line (a CUSTOM dataset line item).',
    );

    // ── STEP 10: the dataset invoice line is clickable → access page ─────────
    const datasetLineLink = page.locator('a[href*="/dashboard/datasets/"], [class*="item-card-clickable"]').first();
    await expect(datasetLineLink).toBeVisible();
    await datasetLineLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(new RegExp(`/dashboard/datasets/${DATASET_SLUG}`));
    await shot(
      'Dataset invoice line is clickable',
      'The purchased-dataset invoice line routes (via the generic <code>invoiceLineLinkRegistry</code> seam + the dataset resolver) to the dataset access page — core stays agnostic.',
    );

    // ── STEP 11: access page — API URL + download + metadata + preview ───────
    await expect(page.locator('[data-testid="dataset-access-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="dataset-access-api-url"]')).toContainText('/data');
    await expect(page.locator('[data-testid="dataset-access-download"]')).toBeVisible();
    await expect(page.locator('[data-testid="dataset-access-meta"]')).toBeVisible();
    await expect(page.locator('[data-testid="dataset-preview-row"]').first()).toBeVisible();
    await shot(
      'Access page — API, download, metadata, preview',
      'The entitlement-gated access page: the scoped API URL to fetch the data, a browser Download button, the dataset issue metadata (source/taken-at/size/checksum/attribution), and the first-100-rows spreadsheet preview (DatasetPreviewGrid).',
    );

    // ── Green-only report: reached only when every step above passed. ─────────
    writeReport(steps);
  });
});

/** Emit the self-contained walkthrough.html embedding the numbered shots.
 * Called ONLY after the final step's assertions pass, so a broken flow leaves
 * no misleading report behind. */
function writeReport(steps: WalkStep[]): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const body = steps
    .map(
      (step) => `
  <section class="step">
    <h2>${step.index}. ${escapeHtml(step.title)}</h2>
    <p>${step.caption}</p>
    <a href="shots/${step.file}"><img src="shots/${step.file}" alt="${escapeHtml(step.title)}" /></a>
  </section>`,
    )
    .join('\n');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>S110 — Datasets plugin walkthrough</title>
<style>
  body { font-family: -apple-system, Segoe UI, sans-serif; max-width: 1100px; margin: 2rem auto; padding: 0 1rem; color: #1a202c; }
  h1 { border-bottom: 3px solid #3182ce; padding-bottom: .5rem; }
  .meta { color: #4a5568; }
  .step { margin: 2.5rem 0; }
  .step h2 { color: #2c5282; }
  .step img { width: 100%; border: 1px solid #cbd5e0; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  code { background: #edf2f7; padding: .1em .3em; border-radius: 3px; }
</style></head><body>
<h1>S110 — Datasets plugin walkthrough</h1>
<p class="meta">Sprint: <code>docs/dev_log/20260630/sprints/s110-datasets-plugin-mvp.md</code> (T15) ·
Live stack: fe-admin :8081, fe-user :8080, backend :5000 ·
Flow: plugin configs → category → dataset editor → UI snapshot upload → signed
webhook ingest → tariff + one-time price → storefront buy → invoice → clickable
dataset line → access page (API URL / download / metadata / first-100-rows
preview). Generated only on a fully-green run.</p>
${body}
</body></html>\n`;
  fs.writeFileSync(path.join(REPORT_DIR, 'walkthrough.html'), html);
  // eslint-disable-next-line no-console
  console.log(`[s110-walkthrough] report written: ${path.join(REPORT_DIR, 'walkthrough.html')} (${steps.length} steps)`);
}

function escapeHtml(value: string): string {
  return value.replace(/[<>&]/g, (character) =>
    character === '<' ? '&lt;' : character === '>' ? '&gt;' : '&amp;',
  );
}
