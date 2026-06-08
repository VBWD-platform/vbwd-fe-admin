/**
 * E2E Walkthrough — full lifecycle across admin + storefront, one screenshot per step.
 *
 * Flow (19 steps):
 *   Admin (:8081)     login → dashboard → Users → create user (all fields)
 *                     → Edit User → grant the "Basic" access level → save
 *   Storefront (:8080) new user logs in → native plans (/landing1) → buy GHRM
 *                     → accept terms → "Activate for Free"  (creates invoice + subscription)
 *   Admin (:8081)     Invoices → the invoice → the subscription → inside the package (plan)
 *
 * It is a real test (light assertions) AND a documentation generator: every step is
 * screenshotted, attached to the Playwright report, and (if WALKTHROUGH_SHOTS is set)
 * written to that directory as NN-title.png so the HTML walkthrough can be regenerated.
 *
 * Run (both apps must be up; E2E_BASE_URL stops Playwright from spawning a dev server):
 *   E2E_BASE_URL=http://localhost:8081 npx playwright test walkthrough-create-buy-inspect
 *   # optional: dump numbered shots to a folder
 *   WALKTHROUGH_SHOTS=docs/dev_log/.../walkthrough/shots E2E_BASE_URL=http://localhost:8081 \
 *     npx playwright test walkthrough-create-buy-inspect
 *
 * Learnings baked in (so it stays reliable):
 *   - Admin auth: after UI login, navigate ONLY via in-app clicks (sidebar links/buttons).
 *     A full page goto() reboots the SPA and the router guard bounces back to /admin/login.
 *   - Sidebar nav-* testids are rotted (dropdown groups now); click sidebar links by text.
 *   - The native CMS pricing page (/pricing-native) currently renders empty, so the working
 *     native plans listing /landing1 is used.
 *   - A $0 plan (GHRM) is bought so checkout completes without a payment gateway while still
 *     producing a real invoice + subscription.
 */
import { test, expect } from '@playwright/test';
import { adminCredentials } from './helpers/auth';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN = process.env.ADMIN_URL || 'http://localhost:8081';
const STORE = process.env.STORE_URL || 'http://localhost:8080';
const SHOTS_DIR = process.env.WALKTHROUGH_SHOTS || '';
const NEW_USER_PASSWORD = 'UserPass123@';
// €0 software plan whose checkout completes with "Activate for Free".
const PLAN_BUY_TESTID = process.env.WALKTHROUGH_PLAN || 'choose-plan-plugin-ghrm';
const PLAN_NAME = process.env.WALKTHROUGH_PLAN_NAME || 'GHRM';

if (SHOTS_DIR) fs.mkdirSync(SHOTS_DIR, { recursive: true });

test.describe('Walkthrough: create user → grant Basic → buy software → inspect invoice', () => {
  // One sequential, stateful journey — must not run split/parallel.
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  test('full lifecycle with a screenshot at every step', async ({ page }, testInfo) => {
    // The journey spans two apps + ~19 navigations; give it room.
    test.setTimeout(300_000);
    // Cap individual actions so a non-matching optional selector fails fast
    // (caught) instead of hanging until the whole-test timeout.
    page.setDefaultTimeout(12_000);
    let step = 0;
    const newEmail = `walkthrough.user.${Date.now()}@example.com`;

    /** Run a labelled step, then screenshot it (report attachment + optional numbered file). */
    const shot = async (title: string) => {
      step += 1;
      const file = `${String(step).padStart(2, '0')}-${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
      const buf = await page.screenshot({ fullPage: false });
      await testInfo.attach(`${step}. ${title}`, { body: buf, contentType: 'image/png' });
      if (SHOTS_DIR) fs.writeFileSync(path.join(SHOTS_DIR, file), buf);
    };

    /** In-app (SPA) sidebar navigation by visible link text — never goto() after login. */
    const clickNav = async (name: string): Promise<boolean> => {
      const tries = [
        () => page.getByRole('link', { name, exact: true }).first().click({ timeout: 5000 }),
        () => page.locator(`aside >> text="${name}"`).first().click({ timeout: 4000 }),
        () => page.locator(`a:has-text("${name}")`).first().click({ timeout: 4000 }),
      ];
      for (const t of tries) { try { await t(); return true; } catch { /* next */ } }
      return false;
    };
    const clickAny = async (selectors: string[]): Promise<boolean> => {
      for (const s of selectors) { try { await page.click(s, { timeout: 3000 }); return true; } catch { /* next */ } }
      return false;
    };

    // ── ADMIN: login ────────────────────────────────────────────────────────
    await page.goto(`${ADMIN}/admin/login`, { waitUntil: 'networkidle' });
    await shot('Admin login');
    await page.locator('input[type="email"], input#username, input[type="text"]').first().fill(adminCredentials.email);
    await page.locator('input[type="password"]').fill(adminCredentials.password);
    await shot('Admin login filled');
    await Promise.all([
      page.waitForURL((u) => !String(u).includes('/login'), { timeout: 15000 }),
      page.locator('[data-testid="login-button"], button:has-text("Sign In"), button[type="submit"]').first().click(),
    ]);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/(dashboard)?$/);
    await shot('Admin dashboard');

    // ── ADMIN: Users → create user (all fields) ──────────────────────────────
    await clickNav('Users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="users-view"], table').first()).toBeVisible({ timeout: 10000 });
    await shot('Users list');

    await clickAny(['[data-testid="create-user-button"]', 'button:has-text("Create")', 'button:has-text("New user")']);
    await expect(page.locator('[data-testid="user-create-view"], form').first()).toBeVisible({ timeout: 10000 });
    await shot('Create user form');

    const fills: [string, string][] = [
      ['#email', newEmail], ['#password', NEW_USER_PASSWORD], ['#firstName', 'Walk'], ['#lastName', 'Through'],
      ['#addressLine1', '12 Demo Street'], ['#addressLine2', 'Suite 4'], ['#city', 'Berlin'],
      ['#postalCode', '10115'], ['#phone', '+49 30 1234567'],
    ];
    for (const [sel, val] of fills) { await page.locator(sel).fill(val).catch(() => {}); }
    await page.locator('#status').selectOption('active').catch(() => {});
    await page.locator('#role').selectOption('USER').catch(() => {});
    // Country labels are i18n keys (e.g. "countries.germany") — select the first real option.
    await page.locator('#country').selectOption({ index: 1 }).catch(() => {});
    await shot('Create user filled');

    await clickAny(['[data-testid="submit-button"]', 'button:has-text("Create")', 'button:has-text("Save")', 'button[type="submit"]']);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/users(\/|$)/);
    await shot('User created');

    // ── ADMIN: Edit User → grant Basic access level ──────────────────────────
    await clickAny(['button:has-text("Edit User")', 'a:has-text("Edit User")']);
    await expect(page.locator('[data-testid="user-edit-view"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('User Access Levels').first()).toBeVisible({ timeout: 10000 });
    await shot('Edit user — access levels');

    await page.getByRole('checkbox', { name: 'Basic' }).check({ timeout: 5000 })
      .catch(async () => { await page.locator('label:has-text("Basic")').first().click().catch(() => {}); });
    await expect(page.getByRole('checkbox', { name: 'Basic' })).toBeChecked();
    await shot('Grant Basic permission');

    await clickAny(['button:has-text("Save Changes")', 'button:has-text("Save")', '[data-testid="submit-button"]']);
    await page.waitForTimeout(2000);
    await shot('Basic granted saved');

    // ── STOREFRONT: new user logs in, buys software ──────────────────────────
    await page.goto(`${STORE}/login`, { waitUntil: 'networkidle' });
    await page.locator('#email, input[type="email"]').first().fill(newEmail);
    await page.locator('input[type="password"]').fill(NEW_USER_PASSWORD);
    await shot('Storefront login as the new user');
    await Promise.all([
      page.waitForURL((u) => !String(u).includes('/login'), { timeout: 15000 }),
      page.locator('button:has-text("Login")').click(),
    ]);
    await page.waitForLoadState('networkidle');

    await page.goto(`${STORE}/landing1`, { waitUntil: 'networkidle' });
    await expect(page.locator('button:has-text("Choose Plan")').first()).toBeVisible({ timeout: 15000 });
    await shot('Native plans — Choose your plan');

    await page.locator(`[data-testid="${PLAN_BUY_TESTID}"]`).click({ timeout: 6000 })
      .catch(async () => { await page.locator('button:has-text("Choose Plan")').first().click(); });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 10000 });
    await shot('Checkout the software');

    await page.locator('input[type="checkbox"]').first().check().catch(() => {});
    await shot('Accept terms');

    await clickAny([
      'button:has-text("Activate for Free")', 'button:has-text("Activate")',
      '[data-testid="confirm-checkout"]', 'button:has-text("Complete")', 'button:has-text("Pay")',
    ]);
    await page.waitForURL(/\/checkout\/confirmation/, { timeout: 20000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/invoice_id=/);
    await shot('Software activated');

    // ── ADMIN: Invoices → the invoice → subscription → package ───────────────
    await page.goto(`${ADMIN}/admin/login`, { waitUntil: 'networkidle' });
    await page.locator('input[type="email"], input#username, input[type="text"]').first().fill(adminCredentials.email);
    await page.locator('input[type="password"]').fill(adminCredentials.password);
    await Promise.all([
      page.waitForURL((u) => !String(u).includes('/login'), { timeout: 15000 }),
      page.locator('[data-testid="login-button"], button:has-text("Sign In")').first().click(),
    ]);
    await page.waitForLoadState('networkidle');

    await clickNav('Invoices');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="invoices-view"], table').first()).toBeVisible({ timeout: 10000 });
    await shot('Admin invoices list');

    // Newest invoice (the purchase just made) is the top row.
    await clickAny(['tr[data-testid^="invoice-row-"]', 'table tbody tr']);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/invoices\//);
    await shot('Invoice detail');

    // No direct invoice→subscription link in the core view: open the subscription
    // via its list (the user's just-created one is the most recent / matches the plan).
    const wentToSub = await clickAny([`a[href*="/admin/subscriptions/"]`, '[data-testid="subscription-info"] a']);
    if (!wentToSub || !/\/admin\/subscriptions\//.test(page.url())) {
      await clickNav('Subscriptions');
      await page.waitForLoadState('networkidle');
      await clickAny([`tr:has-text("${PLAN_NAME}")`, 'tr[data-testid^="subscription-row-"]', 'table tbody tr']);
      await page.waitForLoadState('networkidle');
    }
    await expect(page).toHaveURL(/\/admin\/subscriptions\//);
    await expect(page.locator('text=ACTIVE').first()).toBeVisible({ timeout: 10000 });
    await shot('Subscription detail');

    // Go inside the package: Plans list (under the "Tarifs" group) → the plan's name cell.
    if (!(await clickNav('Plans'))) { await clickNav('Tarifs'); await page.waitForTimeout(400); await clickNav('Plans'); }
    await page.waitForLoadState('networkidle');
    // The plan name cell (2nd <td>) is the clickable target — navigateToPlan(plan.id).
    const nameCell = page.locator('tr', { hasText: PLAN_NAME }).first().locator('td').nth(1);
    await nameCell.click({ timeout: 6000 }).catch(async () => {
      await page.locator(`text=${PLAN_NAME}`).first().click().catch(() => {});
    });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/plans\/.*\/edit/);
    await shot('Inside the package');

    // eslint-disable-next-line no-console
    console.log(`[walkthrough] done — user=${newEmail} plan=${PLAN_NAME}; ${step} steps captured` +
      (SHOTS_DIR ? ` to ${SHOTS_DIR}` : ' (attached to report)'));
  });
});
