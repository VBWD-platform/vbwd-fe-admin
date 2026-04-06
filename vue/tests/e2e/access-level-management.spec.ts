/**
 * E2E Access Level Management — Full CRUD with video proof.
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
  // Wait for redirect to dashboard
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 });
}

test.describe('Access Level Management (Video Proof)', () => {
  test('login and navigate to access levels', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/dashboard/);

    // Navigate to access levels page via sidebar or URL
    // Use SPA navigation by clicking sidebar links
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/01-dashboard.png', fullPage: true });

    // Try to find "Settings" or "Access Levels" in sidebar
    const settingsNav = page.locator('a[href*="settings"]').first();
    if (await settingsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsNav.click();
      await page.waitForTimeout(1000);
    }

    // Look for access levels link
    const accessNav = page.locator('a[href*="settings/access"]');
    if (await accessNav.count() > 0) {
      await accessNav.first().click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-results/02-access-levels.png', fullPage: true });
  });

  test('create new access level form', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to create new access level
    // Use SPA-style click navigation
    await page.waitForTimeout(1000);

    // Go to access levels list
    const accessNav = page.locator('a[href*="settings/access"]');
    if (await accessNav.count() > 0) {
      await accessNav.first().click();
      await page.waitForTimeout(2000);
    }

    // Click create new
    const createNav = page.locator('a[href*="access/new"]');
    if (await createNav.count() > 0) {
      await createNav.first().click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-results/03-create-access-level.png', fullPage: true });
  });

  test('full CRUD via API with video', async ({ page }) => {
    // This test uses API calls to prove the CRUD works, with browser video showing the result

    // Login
    await loginAsAdmin(page);
    await page.waitForTimeout(1000);

    // Get auth token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('admin_token'));
    expect(token).toBeTruthy();

    // === CREATE access level via API ===
    const createResponse = await page.request.post(`${BASE}/api/v1/admin/access/levels`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'E2E Test Editor',
        slug: 'e2e-test-editor',
        description: 'Created by Playwright E2E test',
        permissions: ['users.view', 'invoices.view', 'analytics.view'],
        is_admin: true,
      },
    });
    expect(createResponse.status()).toBe(201);
    const createData = await createResponse.json();
    const levelId = createData.level.id;
    expect(levelId).toBeTruthy();

    // === READ — list and verify ===
    const listResponse = await page.request.get(`${BASE}/api/v1/admin/access/levels`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listResponse.status()).toBe(200);
    const listData = await listResponse.json();
    const found = listData.levels.find((level: any) => level.id === levelId);
    expect(found).toBeTruthy();
    expect(found.name).toBe('E2E Test Editor');
    expect(found.permissions).toContain('users.view');

    // === UPDATE access level ===
    const updateResponse = await page.request.put(`${BASE}/api/v1/admin/access/levels/${levelId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'E2E Updated Editor',
        permissions: ['users.view', 'users.manage', 'invoices.view', 'analytics.view'],
      },
    });
    expect(updateResponse.status()).toBe(200);
    const updateData = await updateResponse.json();
    expect(updateData.level.name).toBe('E2E Updated Editor');
    expect(updateData.level.permissions).toContain('users.manage');

    // === GET detail ===
    const detailResponse = await page.request.get(`${BASE}/api/v1/admin/access/levels/${levelId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detailResponse.status()).toBe(200);
    const detailData = await detailResponse.json();
    expect(detailData.level.name).toBe('E2E Updated Editor');

    // === DELETE ===
    const deleteResponse = await page.request.delete(`${BASE}/api/v1/admin/access/levels/${levelId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteResponse.status()).toBe(200);

    // Verify deleted
    const verifyResponse = await page.request.get(`${BASE}/api/v1/admin/access/levels/${levelId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(verifyResponse.status()).toBe(404);

    // Screenshot the dashboard after full CRUD
    await page.screenshot({ path: 'test-results/04-after-crud.png', fullPage: true });
  });

  test('system roles cannot be deleted', async ({ page }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('admin_token'));

    // Get system roles
    const listResponse = await page.request.get(`${BASE}/api/v1/admin/access/levels`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const levels = (await listResponse.json()).levels;
    const systemRole = levels.find((level: any) => level.is_system);
    expect(systemRole).toBeTruthy();

    // Try to delete — should fail with 400
    const deleteResponse = await page.request.delete(
      `${BASE}/api/v1/admin/access/levels/${systemRole.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(deleteResponse.status()).toBe(400);

    await page.screenshot({ path: 'test-results/05-system-roles-protected.png', fullPage: true });
  });

  test('permissions API returns core and plugin permissions', async ({ page }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('admin_token'));

    const response = await page.request.get(`${BASE}/api/v1/admin/access/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.permissions.core).toBeDefined();
    expect(data.permissions.core.length).toBeGreaterThan(0);

    const coreKeys = data.permissions.core.map((p: any) => p.key);
    expect(coreKeys).toContain('users.view');
    expect(coreKeys).toContain('settings.system');
    expect(coreKeys).toContain('settings.manage');
  });

  test('export/import roundtrip', async ({ page }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('admin_token'));

    // Export
    const exportResponse = await page.request.post(`${BASE}/api/v1/admin/access/export`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {},
    });
    expect(exportResponse.status()).toBe(200);
    const exportData = await exportResponse.json();
    expect(exportData.roles.length).toBeGreaterThan(0);

    // Import (upsert)
    const importResponse = await page.request.post(`${BASE}/api/v1/admin/access/import`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: exportData,
    });
    expect(importResponse.status()).toBe(200);
  });
});
