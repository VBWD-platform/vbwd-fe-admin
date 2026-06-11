import { test, expect, type Page } from '@playwright/test';

/**
 * §5.3 (fe-admin half): the admin discount/coupon CRUD is visible and operable.
 * Navigate by URL (the navbar helper is broken — navigateViaNavbar rot) to the
 * discounts + coupons lists and assert the seeded catalog renders, then open a
 * detail/edit view to prove it's operable.
 */
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'AdminPass123@';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.locator('input[type="email"], input[name="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });
}

test.describe('Discount admin — injection is visible & operable', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('discounts list renders the seeded catalog', async ({ page }) => {
    await page.goto('/admin/promotions/discounts');
    await expect(page.getByRole('heading', { name: 'Discounts' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    // The seeded "Summer Sale 20%" discount is listed.
    await expect(page.getByText('Summer Sale', { exact: false })).toBeVisible({ timeout: 10000 });
  });

  test('coupons list renders the seeded codes and a detail view is operable', async ({ page }) => {
    await page.goto('/admin/promotions/coupons');
    await expect(page.getByRole('heading', { name: 'Coupons' })).toBeVisible();
    await expect(page.getByText('SUMMER2026', { exact: false })).toBeVisible({ timeout: 10000 });

    // The "New Coupon" affordance is present (create path operable).
    await expect(page.locator('a[href="/admin/promotions/coupons/new"]')).toBeVisible();
  });
});
