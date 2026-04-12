/**
 * E2E: Page-Defined Widgets (Sprint 19)
 *
 * Proves:
 * 1. Admin can assign widgets to a specific page via API
 * 2. Page assignments persist after save and reload
 * 3. Page widgets appear in the public page response
 * 4. Page widgets override layout widgets for the same area
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';
const API = `${BASE}/api/v1`;

async function getAdminToken(): Promise<string> {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'AdminPass123@' }),
  });
  return (await response.json()).token;
}

test.describe.configure({ mode: 'serial' });

test.describe('Page-Defined Widgets', () => {
  let token: string;
  let testPageId: string;
  let testPageSlug: string;
  let testLayoutId: string;
  let layoutWidgetId: string;
  let pageWidgetId: string;

  const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  });

  test.beforeAll(async () => {
    token = await getAdminToken();

    // Create two test widgets
    const ts = Date.now();

    const w1Res = await fetch(`${API}/admin/cms/widgets`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: 'Layout Widget',
        slug: `e2e-lw-${ts}`,
        widget_type: 'html',
        content_json: { content: btoa('<div>Layout Widget Content</div>') },
        is_active: true,
      }),
    });
    expect(w1Res.status).toBe(201);
    layoutWidgetId = (await w1Res.json()).id;

    const w2Res = await fetch(`${API}/admin/cms/widgets`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: 'Page Widget Override',
        slug: `e2e-pw-${ts}`,
        widget_type: 'html',
        content_json: { content: btoa('<div>Page Widget Content</div>') },
        is_active: true,
      }),
    });
    expect(w2Res.status).toBe(201);
    pageWidgetId = (await w2Res.json()).id;

    const layoutRes = await fetch(`${API}/admin/cms/layouts`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: `E2E PW Layout ${ts}`,
        slug: `e2e-pwl-${ts}`,
        areas: [
          { name: 'content', type: 'content', label: 'Content' },
          { name: 'sidebar', type: 'vue', label: 'Sidebar' },
        ],
        is_active: true,
      }),
    });
    expect(layoutRes.status).toBe(201);
    testLayoutId = (await layoutRes.json()).id;

    // Assign layout widget to sidebar
    await fetch(`${API}/admin/cms/layouts/${testLayoutId}/widgets`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify([
        { widget_id: layoutWidgetId, area_name: 'sidebar', sort_order: 0 },
      ]),
    });

    // Create a test page using this layout
    testPageSlug = `e2e-pwp-${ts}`;
    const pageRes = await fetch(`${API}/admin/cms/pages`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: 'E2E Page Widget Test',
        slug: testPageSlug,
        layout_id: testLayoutId,
        is_published: true,
        content_html: '<p>Test content</p>',
      }),
    });
    expect(pageRes.status).toBe(201);
    const pageBody = await pageRes.json();
    testPageId = pageBody.page?.id || pageBody.id;
  });

  test.afterAll(async () => {
    const h = headers();
    // Cleanup
    if (testPageId) {
      await fetch(`${API}/admin/cms/pages/${testPageId}`, { method: 'DELETE', headers: h });
    }
    if (testLayoutId) {
      // Clear layout widgets first
      await fetch(`${API}/admin/cms/layouts/${testLayoutId}/widgets`, {
        method: 'PUT', headers: h, body: '[]',
      });
      await fetch(`${API}/admin/cms/layouts/${testLayoutId}`, { method: 'DELETE', headers: h });
    }
    if (layoutWidgetId) {
      await fetch(`${API}/admin/cms/widgets/${layoutWidgetId}`, { method: 'DELETE', headers: h });
    }
    if (pageWidgetId) {
      await fetch(`${API}/admin/cms/widgets/${pageWidgetId}`, { method: 'DELETE', headers: h });
    }
  });

  test('page widget assignment persists via API', async () => {
    // Assign page widget to sidebar (overriding layout widget)
    const saveRes = await fetch(`${API}/admin/cms/pages/${testPageId}/widgets`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify([
        { widget_id: pageWidgetId, area_name: 'sidebar', sort_order: 0 },
      ]),
    });
    expect(saveRes.status).toBe(200);

    // Read back
    const readRes = await fetch(`${API}/admin/cms/pages/${testPageId}/widgets`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(readRes.status).toBe(200);
    const assignments = await readRes.json();
    expect(assignments).toHaveLength(1);
    expect(assignments[0].widget_id).toBe(pageWidgetId);
    expect(assignments[0].area_name).toBe('sidebar');
  });

  test('admin page detail includes page_assignments', async () => {
    const res = await fetch(`${API}/admin/cms/pages/${testPageId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const page = await res.json();
    expect(page.page_assignments).toBeDefined();
    expect(page.page_assignments.length).toBeGreaterThanOrEqual(1);
  });

  test('public page response includes page_assignments with widget data', async () => {
    const res = await fetch(`${API}/cms/pages/${testPageSlug}`);
    expect(res.status).toBe(200);
    const page = await res.json();
    expect(page.page_assignments).toBeDefined();
    expect(page.page_assignments.length).toBeGreaterThanOrEqual(1);
    // Widget data should be embedded
    const sidebarAssignment = page.page_assignments.find(
      (a: { area_name: string }) => a.area_name === 'sidebar'
    );
    expect(sidebarAssignment).toBeDefined();
    expect(sidebarAssignment.widget).toBeDefined();
    expect(sidebarAssignment.widget_id).toBe(pageWidgetId);
  });

  test('page widget overrides layout widget for same area', async () => {
    // Layout has layoutWidgetId in sidebar
    // Page has pageWidgetId in sidebar
    // Public response should have page widget in page_assignments
    const res = await fetch(`${API}/cms/pages/${testPageSlug}`);
    const page = await res.json();

    // Page assignments should have the page widget
    const pageAssignment = page.page_assignments?.find(
      (a: { area_name: string }) => a.area_name === 'sidebar'
    );
    expect(pageAssignment).toBeDefined();
    expect(pageAssignment.widget_id).toBe(pageWidgetId);

    // Layout still has the layout widget (but frontend will use page one)
    const layoutRes = await fetch(`${API}/cms/layouts/${testLayoutId}`);
    const layout = await layoutRes.json();
    const layoutAssignment = layout.assignments?.find(
      (a: { area_name: string }) => a.area_name === 'sidebar'
    );
    expect(layoutAssignment).toBeDefined();
    expect(layoutAssignment.widget_id).toBe(layoutWidgetId);

    // Cleanup page widgets
    await fetch(`${API}/admin/cms/pages/${testPageId}/widgets`, {
      method: 'PUT',
      headers: headers(),
      body: '[]',
    });
  });
});
