import { test, expect } from '@playwright/test';

// Regression: on /admin/settings/access, selecting a row checkbox must NOT hide
// the table. The bulk-actions bar previously shared a v-if/v-else-if chain with
// the table, so a selection replaced the table instead of appearing above it.
const BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';

test('selecting a checkbox keeps the access-levels table visible', async ({ page }) => {
  await page.goto(`${BASE}/admin/login`);
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });
  await page.locator('[data-testid="username-input"]').fill('admin@example.com');
  await page.locator('[data-testid="password-input"]').fill('AdminPass123@');
  await page.locator('[data-testid="login-button"]').click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 });

  await page.goto(`${BASE}/admin/settings/access`);
  const table = page.locator('table.data-table').first();
  await expect(table).toBeVisible();

  const rowCheckbox = page.locator('tbody input[type="checkbox"]').first();
  await expect(rowCheckbox).toBeVisible();
  await rowCheckbox.check();

  // Bug was: table disappeared. It must stay visible.
  await expect(table).toBeVisible();
  await expect(page.locator('.bulk-actions')).toBeVisible();
});
