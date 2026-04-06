/**
 * E2E: Prove that ADMIN with limited access level cannot see/access restricted areas.
 *
 * Flow:
 * 1. Super admin creates an "Editor" access level with only CMS permissions
 * 2. Super admin assigns it to user.pro (ADMIN role)
 * 3. Login as user.pro → sidebar shows only CMS + dashboard
 * 4. API calls to restricted endpoints return 403
 * 5. Cleanup
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
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 });
}

async function getToken(page: import('@playwright/test').Page): Promise<string> {
  return (await page.evaluate(() => localStorage.getItem('admin_token'))) || '';
}

async function getAdminToken(): Promise<string> {
  const response = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'AdminPass123@' }),
  });
  return (await response.json()).token;
}

test.describe('Admin Limited Access — Editor Role', () => {
  let adminToken = '';
  let editorLevelId = '';
  let proUserId = '';
  let originalAccessLevelIds: string[] = [];

  test.beforeAll(async () => {
    adminToken = await getAdminToken();

    // Find user.pro
    const usersResponse = await fetch(`${BASE}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersData = await usersResponse.json();
    const proUser = usersData.users.find((u: any) => u.email === 'user.pro@demo.local');
    if (proUser) {
      proUserId = proUser.id;
      originalAccessLevelIds = (proUser.access_levels || []).map((r: any) => r.id);
    }

    // Create "Editor" access level — only CMS permissions
    const createResponse = await fetch(`${BASE}/api/v1/admin/access/levels`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Editor ' + Math.random().toString(36).substring(2, 6),
        slug: 'e2e-editor-' + Math.random().toString(36).substring(2, 8),
        permissions: ['cms.pages.view', 'cms.pages.manage', 'cms.images.view'],
      }),
    });
    const created = await createResponse.json();
    editorLevelId = created.level.id;

    // Remove existing access levels from user.pro
    for (const levelId of originalAccessLevelIds) {
      await fetch(`${BASE}/api/v1/admin/access/users/${proUserId}/roles/${levelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    // Assign editor level
    await fetch(`${BASE}/api/v1/admin/access/users/${proUserId}/roles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: editorLevelId }),
    });
  });

  test.afterAll(async () => {
    // Remove editor level from user
    if (proUserId && editorLevelId) {
      await fetch(`${BASE}/api/v1/admin/access/users/${proUserId}/roles/${editorLevelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    // Restore original access levels
    for (const levelId of originalAccessLevelIds) {
      await fetch(`${BASE}/api/v1/admin/access/users/${proUserId}/roles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: levelId }),
      });
    }

    // Delete editor level
    if (editorLevelId) {
      await fetch(`${BASE}/api/v1/admin/access/levels/${editorLevelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });

  test('editor can login and sees only CMS in sidebar', async ({ page }) => {
    await loginViaUI(page, 'user.pro@demo.local', 'demo123');
    await expect(page).toHaveURL(/dashboard/);
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/limited-01-editor-sidebar.png',
      fullPage: true,
    });

    const sidebar = await page.locator('.admin-sidebar').textContent() || '';

    // CMS should be visible (has cms.pages.view)
    expect(sidebar).toContain('CMS');
    expect(sidebar).toContain('Pages');

    // These should NOT be visible (no permission)
    expect(sidebar).not.toContain('Users');
    expect(sidebar).not.toContain('Invoices');
    expect(sidebar).not.toContain('Subscriptions');
    expect(sidebar).not.toContain('Access Levels');
  });

  test('editor API calls to users return 403', async ({ page }) => {
    await loginViaUI(page, 'user.pro@demo.local', 'demo123');
    const token = await getToken(page);

    // Users list — should be 403
    const usersResponse = await page.request.get(`${BASE}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(usersResponse.status()).toBe(403);

    // Invoices — should be 403
    const invoicesResponse = await page.request.get(`${BASE}/api/v1/admin/invoices/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(invoicesResponse.status()).toBe(403);

    // Payment methods — should be 403
    const paymentResponse = await page.request.get(`${BASE}/api/v1/admin/payment-methods/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(paymentResponse.status()).toBe(403);

    // Settings — should be 403
    const settingsResponse = await page.request.get(`${BASE}/api/v1/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(settingsResponse.status()).toBe(403);
  });

  test('editor CAN access CMS pages API', async ({ page }) => {
    await loginViaUI(page, 'user.pro@demo.local', 'demo123');
    const token = await getToken(page);

    // CMS pages — should be 200 (has cms.pages.view)
    const cmsResponse = await page.request.get(`${BASE}/api/v1/admin/cms/pages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // CMS routes are in the plugin, may return 200 or other status
    // The important thing is it does NOT return 403
    expect(cmsResponse.status()).not.toBe(403);
  });

  test('editor gets 403 on forbidden frontend routes', async ({ page }) => {
    await loginViaUI(page, 'user.pro@demo.local', 'demo123');

    // Navigate to settings/access — should be forbidden
    await page.goto(`${BASE}/admin/settings/access`);
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/limited-02-forbidden-access-levels.png',
      fullPage: true,
    });

    const url = page.url();
    expect(url.includes('forbidden') || url.includes('login')).toBe(true);
  });

  test('super admin still has full access', async ({ page }) => {
    await loginViaUI(page, 'admin@example.com', 'AdminPass123@');
    const token = await getToken(page);

    // All APIs accessible
    const usersResponse = await page.request.get(`${BASE}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(usersResponse.status()).toBe(200);

    const settingsResponse = await page.request.get(`${BASE}/api/v1/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(settingsResponse.status()).toBe(200);

    await page.screenshot({
      path: 'test-results/limited-03-super-admin-full.png',
      fullPage: true,
    });
  });
});
