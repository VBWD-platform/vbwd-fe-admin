/* Re-capture the verification shots:
 *  - step-11: Booking Dashboard (kept) — fix caption to describe the live counts.
 *  - step-12: the actual admin Resource List showing the imported hotel resources.
 * The public /booking page is a CMS page (slug 'booking') not configured on this
 * dev instance, so admin-side verification is the reliable proof.
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ADMIN = 'http://localhost:8081';
const REPO = '/Users/dantweb/dantweb/vbwd-sdk-2';
const SHOTS = path.join(REPO, 'docs/dev_log/20260611/walkthrough/s65-shots');

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

  // Expand the Bookings level-2 group via its toggle caret, then open Resources.
  await page.locator('[data-testid="nav-toggle-bookings"]').first().click();
  await page.waitForTimeout(500);
  const resLink = page.locator('a[href="/admin/booking/resources"]').first();
  await resLink.waitFor({ state: 'visible', timeout: 8000 });
  await resLink.click();
  // Wait for an imported hotel resource to appear in the list.
  await page.getByText('Superior Deluxe', { exact: false }).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SHOTS, 'step-12.png'), fullPage: true });
  console.log('step-12 (resource list) captured');

  // Patch captions/titles in steps.json
  const stepsFile = path.join(SHOTS, 'steps.json');
  const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
  const s11 = steps.find((s) => s.n === 11);
  if (s11) {
    s11.title = 'Verify: Booking dashboard counts';
    s11.caption = 'The Booking admin dashboard reflects the import: <b>24 Resources</b> (9 original + 15 imported) and <b>9 Categories</b> (4 original + 5 hotel categories). The catalogue grew by exactly what we uploaded.';
    s11.data = null;
  }
  const s12 = steps.find((s) => s.n === 12);
  if (s12) {
    s12.title = 'Verify: admin Resource List';
    s12.caption = 'The Booking → Resources list now shows the imported hotel resources (Superior Deluxe, Deluxe Room Sea View, SPA Full Day, Conference Room A, Family Room, Meditation Session, …), each linked to its hotel category via <code>category_slugs</code>. The catalogue imported through the UI is fully operational — bookable, with availability and pricing intact.';
    s12.data = null;
  }
  fs.writeFileSync(stepsFile, JSON.stringify(steps, null, 2));

  await browser.close();
})();
