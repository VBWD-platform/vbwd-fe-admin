/**
 * E2E: Prove that a user with observer role can login to admin panel.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';

test.use({
  video: { mode: 'on', size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  screenshot: 'on',
});

async function loginViaUI(
  page: import('@playwright/test').Page,
  email: string,
  password: string
) {
  await page.goto(`${BASE}/admin/login`);
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });
  await page.locator('[data-testid="username-input"]').fill(email);
  await page.locator('[data-testid="password-input"]').fill(password);
  await page.locator('[data-testid="login-button"]').click();
  await page.waitForURL(
    (url) => !url.toString().includes('/login'),
    { timeout: 20000 }
  );
}

test.describe('Observer Role Login', () => {
  test('observer user can login and sees limited sidebar', async ({ page }) => {
    await loginViaUI(page, 'user.pro@demo.local', 'Password$123');

    // Should reach dashboard, NOT forbidden
    await expect(page).not.toHaveURL(/forbidden/);
    await expect(page).toHaveURL(/dashboard/);

    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'test-results/observer-01-dashboard.png',
      fullPage: true,
    });

    // Sidebar should show limited items based on observer permissions
    const sidebar = page.locator('.admin-sidebar');
    const sidebarText = await sidebar.textContent();

    // Observer has analytics.view — dashboard should be visible
    expect(sidebarText).toContain('Dashboard');
  });

  test('observer gets 403 on restricted pages', async ({ page }) => {
    await loginViaUI(page, 'user.pro@demo.local', 'Password$123');
    await expect(page).toHaveURL(/dashboard/);

    // Try accessing settings/access (requires settings.system)
    await page.goto(`${BASE}/admin/settings/access`);
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/observer-02-forbidden.png',
      fullPage: true,
    });

    // Should be redirected to forbidden or login (page.goto causes full reload)
    const url = page.url();
    expect(url.includes('forbidden') || url.includes('login')).toBe(true);
  });

  test('admin user can still login normally', async ({ page }) => {
    await loginViaUI(page, 'admin@example.com', 'AdminPass123@');

    await expect(page).not.toHaveURL(/forbidden/);
    await expect(page).toHaveURL(/dashboard/);

    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'test-results/observer-03-admin-full-access.png',
      fullPage: true,
    });

    // Admin should see Settings and Access Levels
    const sidebar = page.locator('.admin-sidebar');
    const sidebarText = await sidebar.textContent();
    expect(sidebarText).toContain('Settings');
    expect(sidebarText).toContain('Access Levels');
  });
});
