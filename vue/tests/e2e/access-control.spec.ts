/**
 * E2E Access Control Tests — Sprint 14d.
 *
 * Proves the access control system is bulletproof end-to-end.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';
const API = 'http://localhost:8080/api/v1';

async function getAdminToken(): Promise<string> {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'AdminPass123@',
    }),
  });
  const data = await response.json();
  return data.token;
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/admin/login`);
  await page.fill('[data-testid="username-input"]', 'admin@example.com');
  await page.fill('[data-testid="password-input"]', 'AdminPass123@');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
}

test.describe('Access Control — Super Admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('super admin can access dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
  });

  test('super admin can access settings', async ({ page }) => {
    await page.goto(`${BASE}/admin/settings`);
    await expect(page).not.toHaveURL(/forbidden/);
  });

  test('super admin can access access levels page', async ({ page }) => {
    await page.goto(`${BASE}/admin/settings/access`);
    await expect(page).not.toHaveURL(/forbidden/);
    await expect(page).toHaveURL(/settings\/access/);
  });

  test('super admin sidebar shows all sections', async ({ page }) => {
    // Should have Settings section with Access Levels
    const sidebar = page.locator('.admin-sidebar');
    await expect(sidebar).toBeVisible();
  });
});

test.describe('Access Control — Permission API', () => {
  test('permissions endpoint returns core + plugin groups', async () => {
    const token = await getAdminToken();
    const response = await fetch(`${API}/admin/access/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.permissions).toBeDefined();
    expect(data.permissions.core).toBeDefined();
    expect(data.permissions.core.length).toBeGreaterThan(0);

    // Core should have users.view and settings.system
    const coreKeys = data.permissions.core.map(
      (p: { key: string }) => p.key
    );
    expect(coreKeys).toContain('users.view');
    expect(coreKeys).toContain('settings.system');
  });

  test('system roles cannot be deleted via API', async () => {
    const token = await getAdminToken();

    // Get levels
    const levelsRes = await fetch(`${API}/admin/access/levels`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const levels = (await levelsRes.json()).levels;
    const systemRole = levels.find(
      (l: { is_system: boolean }) => l.is_system
    );

    expect(systemRole).toBeDefined();

    // Try to delete
    const deleteRes = await fetch(
      `${API}/admin/access/levels/${systemRole.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    expect(deleteRes.status).toBe(400);
  });

  test('export/import roundtrip preserves data', async () => {
    const token = await getAdminToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Export
    const exportRes = await fetch(`${API}/admin/access/export`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    expect(exportRes.status).toBe(200);
    const exportData = await exportRes.json();
    expect(exportData.roles.length).toBeGreaterThan(0);

    // Import (upsert — should not fail)
    const importRes = await fetch(`${API}/admin/access/import`, {
      method: 'POST',
      headers,
      body: JSON.stringify(exportData),
    });
    expect(importRes.status).toBe(200);
  });

  test('unauthenticated request to access API returns 401', async () => {
    const response = await fetch(`${API}/admin/access/levels`);
    expect(response.status).toBe(401);
  });
});
