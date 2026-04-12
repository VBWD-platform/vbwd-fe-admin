/**
 * E2E: CMS Access Level Visibility
 *
 * Proves that:
 * 1. Admin can assign access levels to widget assignments in layout editor
 * 2. Access levels persist after save and reload
 * 3. Admin can restrict a page to specific access levels
 * 4. Anonymous users don't see restricted widgets on the public frontend
 * 5. Authenticated users with the correct level see restricted widgets
 */
import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';
const API = `${ADMIN_BASE}/api/v1`;

async function getAdminToken(): Promise<string> {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'AdminPass123@' }),
  });
  return (await response.json()).token;
}

test.describe('CMS Access Level Visibility', () => {
  let token: string;
  let testLayoutId: string;
  let testWidgetId: string;
  let testPageSlug: string;
  let userAccessLevelId: string;

  const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  });

  test.beforeAll(async () => {
    token = await getAdminToken();

    // Get a user access level ID (use "logged-in")
    const levelsRes = await fetch(`${API}/admin/access/user-levels`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const levels = (await levelsRes.json()).levels;
    const loggedInLevel = levels.find((l: { slug: string }) => l.slug === 'logged-in');
    userAccessLevelId = loggedInLevel?.id || levels[0]?.id;

    // Create a test widget
    const widgetRes = await fetch(`${API}/admin/cms/widgets`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: 'E2E Visibility Test Widget',
        slug: `e2e-vis-widget-${Date.now()}`,
        widget_type: 'html',
        content_json: { content: btoa('<div data-testid="restricted-widget">Restricted Content</div>') },
        is_active: true,
      }),
    });
    const widgetData = await widgetRes.json();
    testWidgetId = widgetData.widget?.id || widgetData.id;

    // Create a test layout with the widget
    const layoutRes = await fetch(`${API}/admin/cms/layouts`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: `E2E Vis Layout ${Date.now()}`,
        slug: `e2e-vis-layout-${Date.now()}`,
        areas: [
          { name: 'content', type: 'content', label: 'Content' },
          { name: 'sidebar', type: 'vue', label: 'Sidebar' },
        ],
        is_active: true,
      }),
    });
    const layoutData = await layoutRes.json();
    testLayoutId = layoutData.id;

    // Assign widget to sidebar area WITH access level restriction
    await fetch(`${API}/admin/cms/layouts/${testLayoutId}/widgets`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify([
        {
          widget_id: testWidgetId,
          area_name: 'sidebar',
          sort_order: 0,
          required_access_level_ids: [userAccessLevelId],
        },
      ]),
    });

    // Create a test page using this layout
    testPageSlug = `e2e-vis-page-${Date.now()}`;
    await fetch(`${API}/admin/cms/pages`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: 'E2E Visibility Test Page',
        slug: testPageSlug,
        layout_id: testLayoutId,
        is_published: true,
        content_html: '<p>Public content visible to everyone</p>',
      }),
    });
  });

  test.afterAll(async () => {
    // Cleanup: delete page, layout, widget
    const h = headers();
    // Find and delete page
    const pagesRes = await fetch(`${API}/admin/cms/pages?query=e2e-vis`, { headers: h });
    const pages = (await pagesRes.json()).items || [];
    for (const page of pages) {
      if (page.slug === testPageSlug) {
        await fetch(`${API}/admin/cms/pages/${page.id}`, { method: 'DELETE', headers: h });
      }
    }
    // Delete layout
    if (testLayoutId) {
      await fetch(`${API}/admin/cms/layouts/${testLayoutId}`, { method: 'DELETE', headers: h });
    }
    // Delete widget
    if (testWidgetId) {
      await fetch(`${API}/admin/cms/widgets/${testWidgetId}`, { method: 'DELETE', headers: h });
    }
  });

  test('widget access level assignment persists via API', async () => {
    // Read the layout and verify the assignment has the access level
    const res = await fetch(`${API}/admin/cms/layouts/${testLayoutId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const layout = await res.json();
    const sidebarAssignment = layout.assignments.find(
      (a: { area_name: string }) => a.area_name === 'sidebar'
    );
    expect(sidebarAssignment).toBeDefined();
    expect(sidebarAssignment.required_access_level_ids).toContain(userAccessLevelId);
  });

  test('anonymous user does NOT see restricted widget', async () => {
    // Public layout API without auth → widget should be filtered out
    const res = await fetch(
      `${ADMIN_BASE}/api/v1/cms/layouts/${testLayoutId}`
    );
    expect(res.status).toBe(200);
    const layout = await res.json();
    const sidebarAssignment = layout.assignments.find(
      (a: { area_name: string }) => a.area_name === 'sidebar'
    );
    // Anonymous user ("new" level) should NOT see the widget restricted to "logged-in"
    expect(sidebarAssignment).toBeUndefined();
  });

  test('authenticated user WITH matching level sees restricted widget', async () => {
    // Login as test user (who has "logged-in" level)
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'TestPass123@' }),
    });
    const userToken = (await loginRes.json()).token;

    // Public layout API with auth → widget should be visible
    const res = await fetch(
      `${ADMIN_BASE}/api/v1/cms/layouts/${testLayoutId}`,
      { headers: { 'Authorization': `Bearer ${userToken}` } }
    );
    expect(res.status).toBe(200);
    const layout = await res.json();
    const sidebarAssignment = layout.assignments.find(
      (a: { area_name: string }) => a.area_name === 'sidebar'
    );
    expect(sidebarAssignment).toBeDefined();
    expect(sidebarAssignment.widget).toBeDefined();
  });

  test('page access restriction returns 403 for unauthorized user', async () => {
    // Set page-level restriction
    const pagesRes = await fetch(`${API}/admin/cms/pages?query=${testPageSlug}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const pages = (await pagesRes.json()).items || [];
    const page = pages.find((p: { slug: string }) => p.slug === testPageSlug);
    if (page) {
      await fetch(`${API}/admin/cms/pages/${page.id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ required_access_level_ids: [userAccessLevelId] }),
      });
    }

    // Anonymous request → should get 403
    const anonRes = await fetch(`${ADMIN_BASE}/api/v1/cms/pages/${testPageSlug}`);
    expect(anonRes.status).toBe(403);
    const anonData = await anonRes.json();
    expect(anonData.error).toBe('Access denied');

    // Authenticated request with matching level → should get 200
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'TestPass123@' }),
    });
    const userToken = (await loginRes.json()).token;

    const authRes = await fetch(
      `${ADMIN_BASE}/api/v1/cms/pages/${testPageSlug}`,
      { headers: { 'Authorization': `Bearer ${userToken}` } }
    );
    expect(authRes.status).toBe(200);

    // Remove page restriction for cleanup
    if (page) {
      await fetch(`${API}/admin/cms/pages/${page.id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ required_access_level_ids: [] }),
      });
    }
  });
});
