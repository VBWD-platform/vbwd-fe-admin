/**
 * S120 T10 — E2E: the "Blocked countries" tab at /admin/cms/routing-rules.
 *
 * Flow: navigate to the routing screen, switch to the Blocked countries tab,
 * toggle enable + enter `allowme=yes`, save, and assert the value round-trips
 * (the reopened tab reflects what was PUT).
 *
 * Backend note (S120): the backend `/admin/cms/geo-block` endpoints are built
 * in parallel against the same FROZEN contract. This spec is SELF-CONTAINED —
 * it mocks GET/PUT /api/v1/admin/cms/geo-block with an in-memory store so it
 * passes against the running frontend WITHOUT a live backend. Once the backend
 * is deployed the same flow exercises the real API (remove the route mocks).
 *
 * Auth harness (fe-admin lesson): seed BOTH `admin_token` AND
 * `admin_token_user`; a token alone redirects to /admin/login. Navigate by URL
 * (the flat `nav-*` testids are gone — navbar is dropdown groups).
 */
import { test, expect, Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';

const adminUser = {
  id: '1',
  email: 'admin@example.com',
  role: 'SUPER_ADMIN',
  permissions: ['*'],
};

interface GeoBlockConfig {
  is_enabled: boolean;
  bypass_query: string;
  bypass_cookie_ttl_days: number;
  blocked_target_slug: string;
  block_unknown_country: boolean;
  allowed_country_codes: string[];
  allowed_country_count: number;
}

async function seedAuth(page: Page): Promise<void> {
  await page.addInitScript((user) => {
    localStorage.setItem('admin_token', 'test-admin-token');
    localStorage.setItem('admin_token_user', JSON.stringify(user));
  }, adminUser);

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(adminUser),
    });
  });
  await page.route('**/api/v1/admin/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { details: {} } }),
    });
  });
}

async function mockGeoBlockApi(page: Page): Promise<void> {
  const state: GeoBlockConfig = {
    is_enabled: false,
    bypass_query: '',
    bypass_cookie_ttl_days: 30,
    blocked_target_slug: '/locked',
    block_unknown_country: false,
    allowed_country_codes: ['DE', 'AT', 'CH'],
    allowed_country_count: 3,
  };

  await page.route('**/api/v1/admin/cms/geo-block', async (route) => {
    const request = route.request();
    if (request.method() === 'PUT') {
      const body = request.postDataJSON() as Partial<GeoBlockConfig>;
      state.is_enabled = body.is_enabled ?? state.is_enabled;
      state.bypass_query = body.bypass_query ?? state.bypass_query;
      state.bypass_cookie_ttl_days = body.bypass_cookie_ttl_days ?? state.bypass_cookie_ttl_days;
      state.blocked_target_slug = body.blocked_target_slug ?? state.blocked_target_slug;
      state.block_unknown_country = body.block_unknown_country ?? state.block_unknown_country;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(state),
    });
  });

  // The Rules tab fetches routing rules on mount; keep it happy.
  await page.route('**/api/v1/admin/cms/routing-rules', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

test.describe('S120 — Blocked countries tab', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockGeoBlockApi(page);
  });

  test('enabling + saving allowme=yes round-trips', async ({ page }) => {
    await page.goto(`${BASE}/admin/cms/routing-rules`);

    // Switch to the Blocked countries tab.
    await page.locator('[data-testid="subtab-blocked-countries"]').click();
    await expect(page.locator('[data-testid="geoblock-enabled"]')).toBeVisible();

    // Toggle enable + enter the bypass query, then save.
    await page.locator('[data-testid="geoblock-enabled"]').check();
    await page.locator('[data-testid="geoblock-bypass-query"]').fill('allowme=yes');

    const putResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/admin/cms/geo-block') &&
        response.request().method() === 'PUT',
    );
    await page.locator('[data-testid="geoblock-save"]').click();
    await putResponse;

    // Reopen the tab; the persisted values must round-trip.
    await page.locator('[data-testid="subtab-rules"]').click();
    await page.locator('[data-testid="subtab-blocked-countries"]').click();

    await expect(page.locator('[data-testid="geoblock-enabled"]')).toBeChecked();
    await expect(page.locator('[data-testid="geoblock-bypass-query"]')).toHaveValue('allowme=yes');
  });
});
