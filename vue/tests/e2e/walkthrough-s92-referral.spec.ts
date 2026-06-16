import { test, expect, Page } from '@playwright/test';

// S92 Track B — Referral program admin: frontend walkthrough.
// Promotions → VBWD Referral → Settings (set the issuer commission and save) +
// Referral Statistics (the stats table renders; a seeded coupon shows masked).
// Self-contained for the Settings round-trip; the stats row is asserted only
// when the CI seed step has minted a referral coupon.

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE}/admin/login`);
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 20000 });
  await page.locator('[data-testid="login-email"], input[type="email"]').first().fill('admin@example.com');
  await page.locator('[data-testid="login-password"], input[type="password"]').first().fill('AdminPass123@');
  await page.locator('[data-testid="login-button"]').click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 });
}

test('S92 — referral program: settings round-trip + statistics table', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto(`${BASE}/admin/promotions/referral`, { waitUntil: 'networkidle' });

  await expect(page.getByTestId('referral-admin-tabs')).toBeVisible({ timeout: 15000 });

  // --- Settings: choose "absolute tokens", set a value, save. ---
  await page.getByTestId('referral-subtab-settings').click();
  await expect(page.getByTestId('referral-settings-tab')).toBeVisible();
  await page.getByTestId('commission-type-tokens').click();
  await page.getByTestId('commission-value').fill('50');
  await page.getByTestId('referral-settings-save').click();
  await expect(page.getByTestId('referral-settings-saved')).toBeVisible({ timeout: 10000 });

  // --- Statistics: the table renders; if a coupon was seeded it shows MASKED. ---
  await page.getByTestId('referral-subtab-statistics').click();
  await expect(page.getByTestId('referral-stats-tab')).toBeVisible();
  await expect(page.getByTestId('referral-stats-table')).toBeVisible({ timeout: 10000 });

  // Masking (anti-harvest): a still-unused coupon shows masked (prefix + nick +
  // first4 + x*10 + last2); a used coupon is revealed in full. Prove at least
  // one UNUSED code is masked (the CI seed mints a fresh unused coupon).
  const codeCells = page.locator('[data-testid^="referral-stats-code-"]');
  const count = await codeCells.count();
  if (count > 0) {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) codes.push((await codeCells.nth(i).innerText()).trim());
    expect(codes.some((c) => /x{6,}/i.test(c))).toBeTruthy(); // ≥1 masked unused code
  }

  await page.screenshot({ path: 'test-results/s92-referral-walkthrough.png', fullPage: true });
});
