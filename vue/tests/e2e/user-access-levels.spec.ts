import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5174';
const API = `${BASE}/api/v1`;

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/admin/login`);
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });
  await page.locator('[data-testid="username-input"]').fill('admin@example.com');
  await page.locator('[data-testid="password-input"]').fill('AdminPass123@');
  await page.locator('[data-testid="login-button"]').click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 });
}

async function getAdminToken(): Promise<string> {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'AdminPass123@' }),
  });
  return (await response.json()).token;
}

test.describe('User Access Levels — Admin UI', () => {
  let token: string;

  test.beforeAll(async () => {
    token = await getAdminToken();
  });

  test('two tabs visible on access levels page', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate via sidebar link (SPA navigation preserves auth state)
    const accessNav = page.locator('a[href*="settings/access"]');
    if (await accessNav.count() > 0) {
      await accessNav.first().click();
    } else {
      // Fallback: direct navigation
      await page.goto(`${BASE}/admin/settings/access`);
    }
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Admin Access Levels')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=User Access Levels')).toBeVisible();
  });

  test('user access levels tab shows table or empty state', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate via sidebar
    const accessNav = page.locator('a[href*="settings/access"]');
    if (await accessNav.count() > 0) {
      await accessNav.first().click();
    } else {
      await page.goto(`${BASE}/admin/settings/access`);
    }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=User Access Levels')).toBeVisible({ timeout: 10000 });

    await page.click('text=User Access Levels');
    await page.waitForTimeout(500);

    const table = page.locator('table.data-table');
    const empty = page.locator('p.empty');
    await expect(table.or(empty)).toBeVisible();
  });

  test('user-levels CRUD via API', async () => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // Cleanup from previous runs
    const listRes = await fetch(`${API}/admin/access/user-levels`, { headers });
    const existing = (await listRes.json()).levels;
    const stale = existing.find((l: { slug: string }) => l.slug === 'e2e-test-level');
    if (stale) {
      await fetch(`${API}/admin/access/user-levels/${stale.id}`, {
        method: 'DELETE', headers,
      });
    }

    // Create
    const createRes = await fetch(`${API}/admin/access/user-levels`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'E2E Test Level',
        slug: 'e2e-test-level',
        description: 'Created by Playwright',
        linked_plan_slug: 'basic',
        permissions: ['subscription.plans.view'],
      }),
    });
    expect(createRes.status).toBe(201);
    const { level } = await createRes.json();
    expect(level.name).toBe('E2E Test Level');
    expect(level.linked_plan_slug).toBe('basic');
    expect(level.permissions).toContain('subscription.plans.view');

    // Read
    const getRes = await fetch(`${API}/admin/access/user-levels/${level.id}`, { headers });
    expect(getRes.status).toBe(200);

    // Update
    const updateRes = await fetch(`${API}/admin/access/user-levels/${level.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ name: 'E2E Updated Level', linked_plan_slug: 'pro' }),
    });
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()).level;
    expect(updated.name).toBe('E2E Updated Level');
    expect(updated.linked_plan_slug).toBe('pro');

    // Delete
    const deleteRes = await fetch(`${API}/admin/access/user-levels/${level.id}`, {
      method: 'DELETE', headers,
    });
    expect(deleteRes.status).toBe(200);
  });

  test('user-permissions API returns plugin permissions', async () => {
    const headers = { 'Authorization': `Bearer ${token}` };
    const res = await fetch(`${API}/admin/access/user-permissions`, { headers });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.permissions).toHaveProperty('subscription');
    const keys = data.permissions.subscription.map((p: { key: string }) => p.key);
    expect(keys).toContain('subscription.plans.view');
    expect(keys).toContain('subscription.manage');
  });

  test('user-levels export/import roundtrip', async () => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // Cleanup
    const listPre = await fetch(`${API}/admin/access/user-levels`, { headers });
    const preLevels = (await listPre.json()).levels;
    const stale = preLevels.find((l: { slug: string }) => l.slug === 'export-test-level');
    if (stale) {
      await fetch(`${API}/admin/access/user-levels/${stale.id}`, {
        method: 'DELETE', headers,
      });
    }

    // Create
    await fetch(`${API}/admin/access/user-levels`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Export Test Level',
        slug: 'export-test-level',
        linked_plan_slug: 'free',
        permissions: ['user.profile.view'],
      }),
    });

    // Export
    const exportRes = await fetch(`${API}/admin/access/user-levels/export`, {
      method: 'POST', headers, body: JSON.stringify({}),
    });
    expect(exportRes.status).toBe(200);
    const exported = await exportRes.json();
    const found = exported.user_access_levels.find(
      (l: { slug: string }) => l.slug === 'export-test-level'
    );
    expect(found).toBeDefined();
    expect(found.linked_plan_slug).toBe('free');

    // Delete
    const listMid = await fetch(`${API}/admin/access/user-levels`, { headers });
    const midLevels = (await listMid.json()).levels;
    const toDelete = midLevels.find((l: { slug: string }) => l.slug === 'export-test-level');
    if (toDelete) {
      await fetch(`${API}/admin/access/user-levels/${toDelete.id}`, {
        method: 'DELETE', headers,
      });
    }

    // Import
    const importRes = await fetch(`${API}/admin/access/user-levels/import`, {
      method: 'POST', headers, body: JSON.stringify(exported),
    });
    expect(importRes.status).toBe(200);

    // Verify
    const listAfter = await fetch(`${API}/admin/access/user-levels`, { headers });
    const afterLevels = (await listAfter.json()).levels;
    const reimported = afterLevels.find(
      (l: { slug: string }) => l.slug === 'export-test-level'
    );
    expect(reimported).toBeDefined();

    // Cleanup
    if (reimported) {
      await fetch(`${API}/admin/access/user-levels/${reimported.id}`, {
        method: 'DELETE', headers,
      });
    }
  });
});
