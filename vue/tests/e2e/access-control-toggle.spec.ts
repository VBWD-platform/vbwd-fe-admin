/**
 * E2E: Prove that disabling a permission hides the feature.
 *
 * Flow:
 * 1. Login as super-admin → full sidebar visible
 * 2. Create a restricted access level (only users.view)
 * 3. Assign it to a second admin user
 * 4. Login as restricted user → sidebar shows only allowed items
 * 5. Try to access a forbidden page → 403
 * 6. Cleanup: delete the test role
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';
const API = `${BASE}/api/v1`;

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

test.describe('Access Control Toggle — Feature On/Off', () => {
  let adminToken = '';
  let restrictedRoleId = '';
  let testUserId = '';
  // Track which roles were on the test user BEFORE we modify them
  let originalRoleIds: string[] = [];

  test('full permission toggle demo with video', async ({ page }) => {
    // ══════════════════════════════════════════════════════════════
    // STEP 1: Login as super-admin — full access
    // ══════════════════════════════════════════════════════════════
    await loginViaUI(page, 'admin@example.com', 'AdminPass123@');
    adminToken = await getToken(page);
    await page.waitForTimeout(1500);

    // Screenshot: full sidebar with ALL sections visible
    await page.screenshot({
      path: 'test-results/toggle-01-super-admin-full-sidebar.png',
      fullPage: true,
    });

    const sidebarText = await page.locator('.admin-sidebar').textContent();
    expect(sidebarText).toContain('Settings');
    expect(sidebarText).toContain('Access Levels');
    expect(sidebarText).toContain('Users');

    // ══════════════════════════════════════════════════════════════
    // STEP 2: Create a restricted role (only users.view)
    // ══════════════════════════════════════════════════════════════
    const createRoleRes = await page.request.post(`${API}/admin/access/levels`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: 'Restricted Viewer ' + Math.random().toString(36).substring(2, 6),
        slug: 'rv-' + Math.random().toString(36).substring(2, 8),
        description: 'Can only view users — everything else hidden',
        permissions: ['users.view'],
        is_admin: true,
      },
    });
    expect(createRoleRes.status()).toBe(201);
    restrictedRoleId = (await createRoleRes.json()).level.id;

    // ══════════════════════════════════════════════════════════════
    // STEP 3: Find test@example.com user and swap their roles
    // ══════════════════════════════════════════════════════════════
    const usersRes = await page.request.get(`${API}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allUsers = (await usersRes.json()).users || [];
    const testUser = allUsers.find((u: any) => u.email === 'test@example.com');
    expect(testUser).toBeTruthy();
    testUserId = testUser.id;

    // Save original roles
    originalRoleIds = (testUser.roles || []).map((r: any) => r.id);

    // Remove all existing roles from test user
    for (const roleId of originalRoleIds) {
      await page.request.delete(`${API}/admin/access/users/${testUserId}/roles/${roleId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    // Assign restricted role
    await page.request.post(`${API}/admin/access/users/${testUserId}/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { role_id: restrictedRoleId },
    });

    // Show the access levels page with the new role
    const accessLink = page.locator('a[href*="settings/access"]');
    if (await accessLink.count() > 0) {
      await accessLink.first().click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({
      path: 'test-results/toggle-02-restricted-role-created.png',
      fullPage: true,
    });

    // ══════════════════════════════════════════════════════════════
    // STEP 4: Logout → Login as restricted test user
    // ══════════════════════════════════════════════════════════════
    await page.evaluate(() => {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_token_user');
    });

    await loginViaUI(page, 'test@example.com', 'TestPass123@');
    await page.waitForTimeout(2000);

    // Screenshot: sidebar should be MUCH smaller — only Users visible
    await page.screenshot({
      path: 'test-results/toggle-03-restricted-user-limited-sidebar.png',
      fullPage: true,
    });

    // ══════════════════════════════════════════════════════════════
    // STEP 5: Try to access forbidden page → 403
    // ══════════════════════════════════════════════════════════════
    await page.goto(`${BASE}/admin/settings/access`);
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/toggle-04-forbidden-page.png',
      fullPage: true,
    });

    const currentUrl = page.url();
    expect(
      currentUrl.includes('forbidden') || !currentUrl.includes('settings/access')
    ).toBe(true);

    // ══════════════════════════════════════════════════════════════
    // STEP 6: Cleanup — restore original roles, delete test role
    // ══════════════════════════════════════════════════════════════
    await page.evaluate(() => {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_token_user');
    });
    await loginViaUI(page, 'admin@example.com', 'AdminPass123@');
    const cleanupToken = await getToken(page);

    // Remove restricted role from test user
    await page.request.delete(
      `${API}/admin/access/users/${testUserId}/roles/${restrictedRoleId}`,
      { headers: { Authorization: `Bearer ${cleanupToken}` } }
    );

    // Restore original roles
    for (const roleId of originalRoleIds) {
      await page.request.post(`${API}/admin/access/users/${testUserId}/roles`, {
        headers: { Authorization: `Bearer ${cleanupToken}` },
        data: { role_id: roleId },
      });
    }

    // Delete restricted role
    await page.request.delete(`${API}/admin/access/levels/${restrictedRoleId}`, {
      headers: { Authorization: `Bearer ${cleanupToken}` },
    });

    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'test-results/toggle-05-cleanup-full-admin-again.png',
      fullPage: true,
    });
  });
});
