/**
 * E2E: Super Admin full CRUD — login, manage users, access all areas.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';

test.use({
  video: { mode: 'on', size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  screenshot: 'on',
});

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/admin/login`);
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });
  await page.locator('[data-testid="username-input"]').fill('admin@example.com');
  await page.locator('[data-testid="password-input"]').fill('AdminPass123@');
  await page.locator('[data-testid="login-button"]').click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 });
}

async function getToken(page: import('@playwright/test').Page): Promise<string> {
  return (await page.evaluate(() => localStorage.getItem('admin_token'))) || '';
}

test.describe('Super Admin — Full Access CRUD', () => {
  test('super admin can login and sees full sidebar', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/dashboard/);

    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/super-admin-01-dashboard.png', fullPage: true });

    const sidebar = await page.locator('.admin-sidebar').textContent();
    expect(sidebar).toContain('Dashboard');
    expect(sidebar).toContain('Users');
    expect(sidebar).toContain('Settings');
    expect(sidebar).toContain('Access Levels');
  });

  test('super admin can list users', async ({ page }) => {
    await loginAsAdmin(page);
    const token = await getToken(page);

    const response = await page.request.get(`${BASE}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.users.length).toBeGreaterThan(0);

    // Verify admin user is SUPER_ADMIN
    const admin = data.users.find((u: any) => u.email === 'admin@example.com');
    expect(admin).toBeTruthy();
    expect(admin.role).toBe('SUPER_ADMIN');
  });

  test('super admin can create and delete a user', async ({ page }) => {
    await loginAsAdmin(page);
    const token = await getToken(page);
    const testEmail = `e2e-test-${Date.now()}@example.com`;

    // Create user
    const createResponse = await page.request.post(`${BASE}/api/v1/admin/users/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        email: testEmail,
        password: 'TestPass123@',
        first_name: 'E2E',
        last_name: 'TestUser',
        role: 'USER',
      },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    expect(created.email).toBe(testEmail);
    const userId = created.id;

    // Verify user exists
    const getResponse = await page.request.get(`${BASE}/api/v1/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getResponse.status()).toBe(200);

    // Delete user
    const deleteResponse = await page.request.delete(`${BASE}/api/v1/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteResponse.status()).toBe(200);
  });

  test('super admin can update user role', async ({ page }) => {
    await loginAsAdmin(page);
    const token = await getToken(page);

    // Find test user
    const listResponse = await page.request.get(`${BASE}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const users = (await listResponse.json()).users;
    const testUser = users.find((u: any) => u.email === 'test@example.com');
    expect(testUser).toBeTruthy();

    // Update role to ADMIN
    const updateResponse = await page.request.put(
      `${BASE}/api/v1/admin/users/${testUser.id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { role: 'ADMIN' },
      }
    );
    expect(updateResponse.status()).toBe(200);

    // Revert back to USER
    await page.request.put(`${BASE}/api/v1/admin/users/${testUser.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { role: 'USER' },
    });
  });

  test('super admin can access all restricted pages', async ({ page }) => {
    await loginAsAdmin(page);
    const token = await getToken(page);

    // Access levels page (requires settings.system)
    const accessResponse = await page.request.get(`${BASE}/api/v1/admin/access/levels`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(accessResponse.status()).toBe(200);

    // Tax config (requires settings.manage)
    const taxResponse = await page.request.get(`${BASE}/api/v1/admin/tax/rates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(taxResponse.status()).toBe(200);

    // Settings
    const settingsResponse = await page.request.get(`${BASE}/api/v1/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(settingsResponse.status()).toBe(200);

    await page.screenshot({ path: 'test-results/super-admin-02-full-access.png', fullPage: true });
  });

  test('super admin can manage access levels', async ({ page }) => {
    await loginAsAdmin(page);
    const token = await getToken(page);

    // Create access level
    const slug = 'e2e-test-' + Math.random().toString(36).substring(2, 8);
    const createResponse = await page.request.post(`${BASE}/api/v1/admin/access/levels`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'E2E Test Level',
        slug,
        description: 'Created by Playwright test',
        permissions: ['users.view', 'analytics.view'],
      },
    });
    expect(createResponse.status()).toBe(201);
    const levelId = (await createResponse.json()).level.id;

    // Update access level
    const updateResponse = await page.request.put(
      `${BASE}/api/v1/admin/access/levels/${levelId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: 'E2E Updated Level',
          permissions: ['users.view', 'users.manage', 'analytics.view'],
        },
      }
    );
    expect(updateResponse.status()).toBe(200);
    expect((await updateResponse.json()).level.permissions).toContain('users.manage');

    // Delete access level
    const deleteResponse = await page.request.delete(
      `${BASE}/api/v1/admin/access/levels/${levelId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(deleteResponse.status()).toBe(200);
  });
});
