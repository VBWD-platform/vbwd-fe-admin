/**
 * E2E: Page Widget Slots (Sprint 19)
 *
 * Proves:
 * 1. Admin assigns a widget to a page-widget slot on a page
 * 2. The assignment persists (save + reload)
 * 3. Widget with access level restriction is filtered for anonymous users
 * 4. Widget is visible to authenticated users with the correct access level
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';
const API = `${BASE}/api/v1`;

test.describe.configure({ mode: 'serial' });

let token: string;
let testPageId: string;
let testPageSlug: string;
let testLayoutId: string;
let testWidgetId: string;
let loggedInLevelId: string;

async function adminToken(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'AdminPass123@' }),
  });
  return (await res.json()).token;
}

function headers() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

test.describe('Page Widget Slots', () => {
  test.beforeAll(async () => {
    token = await adminToken();
    const ts = Date.now();

    // Get "logged-in" access level ID
    const levelsRes = await fetch(`${API}/admin/access/user-levels`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const levels = (await levelsRes.json()).levels;
    loggedInLevelId = levels.find((l: { slug: string }) => l.slug === 'logged-in')?.id;

    // Create a test widget
    const wRes = await fetch(`${API}/admin/cms/widgets`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        name: 'E2E Page Slot Widget', slug: `e2e-slot-w-${ts}`,
        widget_type: 'html',
        content_json: { content: btoa('<div data-testid="slot-widget">Page Slot Widget Visible</div>') },
        is_active: true,
      }),
    });
    expect(wRes.status).toBe(201);
    testWidgetId = (await wRes.json()).id;

    // Create a layout with a page-widget area
    const lRes = await fetch(`${API}/admin/cms/layouts`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        name: `E2E Slot Layout ${ts}`, slug: `e2e-slot-l-${ts}`,
        areas: [
          { name: 'content', type: 'content', label: 'Content' },
          { name: 'dynamic-slot', type: 'page-widget', label: 'Dynamic Widget Slot' },
        ],
        is_active: true,
      }),
    });
    expect(lRes.status).toBe(201);
    testLayoutId = (await lRes.json()).id;

    // Create a test page using this layout
    testPageSlug = `e2e-slot-p-${ts}`;
    const pRes = await fetch(`${API}/admin/cms/pages`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        name: 'E2E Slot Test Page', slug: testPageSlug,
        layout_id: testLayoutId, is_published: true,
        content_html: '<p>Main content</p>',
      }),
    });
    expect(pRes.status).toBe(201);
    const pData = await pRes.json();
    testPageId = pData.page?.id || pData.id;
  });

  test.afterAll(async () => {
    const h = headers();
    // Clean page widgets first
    await fetch(`${API}/admin/cms/pages/${testPageId}/widgets`, {
      method: 'PUT', headers: h, body: '[]',
    });
    // Delete page
    if (testPageId) await fetch(`${API}/admin/cms/pages/${testPageId}`, { method: 'DELETE', headers: h });
    // Delete layout (clear layout widgets first)
    if (testLayoutId) {
      await fetch(`${API}/admin/cms/layouts/${testLayoutId}/widgets`, { method: 'PUT', headers: h, body: '[]' });
      await fetch(`${API}/admin/cms/layouts/${testLayoutId}`, { method: 'DELETE', headers: h });
    }
    // Delete widget
    if (testWidgetId) await fetch(`${API}/admin/cms/widgets/${testWidgetId}`, { method: 'DELETE', headers: h });
  });

  test('admin assigns widget to page-widget slot', async () => {
    // Assign the test widget to the dynamic-slot area
    const res = await fetch(`${API}/admin/cms/pages/${testPageId}/widgets`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify([{
        widget_id: testWidgetId,
        area_name: 'dynamic-slot',
        sort_order: 0,
        required_access_level_ids: [],
      }]),
    });
    expect(res.status).toBe(200);
  });

  test('assignment persists after reload', async () => {
    const res = await fetch(`${API}/admin/cms/pages/${testPageId}/widgets`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const assignments = await res.json();
    expect(assignments).toHaveLength(1);
    expect(assignments[0].area_name).toBe('dynamic-slot');
    expect(assignments[0].widget_id).toBe(testWidgetId);
  });

  test('public page includes page widget in page_assignments', async () => {
    const res = await fetch(`${API}/cms/pages/${testPageSlug}`);
    expect(res.status).toBe(200);
    const page = await res.json();
    expect(page.page_assignments).toBeDefined();
    const slotAssignment = page.page_assignments.find(
      (a: { area_name: string }) => a.area_name === 'dynamic-slot'
    );
    expect(slotAssignment).toBeDefined();
    expect(slotAssignment.widget).toBeDefined();
    expect(slotAssignment.widget.name).toBe('E2E Page Slot Widget');
  });

  test('widget with access level restriction hidden from anonymous', async () => {
    // Update the page widget to require "logged-in" level
    await fetch(`${API}/admin/cms/pages/${testPageId}/widgets`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify([{
        widget_id: testWidgetId,
        area_name: 'dynamic-slot',
        sort_order: 0,
        required_access_level_ids: [loggedInLevelId],
      }]),
    });

    // Anonymous request — widget should be filtered out
    const anonRes = await fetch(`${API}/cms/pages/${testPageSlug}`);
    expect(anonRes.status).toBe(200);
    const anonPage = await anonRes.json();
    const anonSlot = (anonPage.page_assignments || []).find(
      (a: { area_name: string }) => a.area_name === 'dynamic-slot'
    );
    expect(anonSlot).toBeUndefined();
  });

  test('widget visible to authenticated user with correct level', async () => {
    // Login as test user (has "logged-in" level)
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'TestPass123@' }),
    });
    const userToken = (await loginRes.json()).token;

    // Authenticated request — widget should be visible
    const authRes = await fetch(`${API}/cms/pages/${testPageSlug}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    expect(authRes.status).toBe(200);
    const authPage = await authRes.json();
    const authSlot = (authPage.page_assignments || []).find(
      (a: { area_name: string }) => a.area_name === 'dynamic-slot'
    );
    expect(authSlot).toBeDefined();
    expect(authSlot.widget.name).toBe('E2E Page Slot Widget');

    // Clean up: remove access level restriction
    await fetch(`${API}/admin/cms/pages/${testPageId}/widgets`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify([{
        widget_id: testWidgetId,
        area_name: 'dynamic-slot',
        sort_order: 0,
        required_access_level_ids: [],
      }]),
    });
  });
});
