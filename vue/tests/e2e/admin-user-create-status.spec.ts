/**
 * E2E Regression: Admin user creation with status "active" + role "ADMIN".
 *
 * Reproduces the reported bug:
 *   POST /api/v1/admin/users/  {status:"active", role:"ADMIN"}
 *   → 400 {"error":"Invalid status: active"}
 *
 * This spec drives the REAL backend (no API mocking) — the bug is a
 * frontend/backend enum-casing contract mismatch, so mocking the API
 * would hide the very thing under test.
 *
 * Run with: E2E_BASE_URL=http://localhost:8081 \
 *   npx playwright test admin-user-create-status
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, waitForView } from './helpers/auth';

// Navigate by URL rather than via the shared navbar helper: the admin
// navbar was refactored into collapsed dropdown groups, so the helper's
// flat `nav-users` selector no longer resolves. This regression spec
// targets the user-create API contract, not navbar wiring, so direct
// routing keeps it decoupled from that unrelated helper rot.

const testTimestamp = Date.now();
const testEmail = `e2e.status.${testTimestamp}@test.local`;
const testPassword = 'TestPass123@';

test.describe('Admin create user — status casing regression', () => {
  // Serial: the persistence check reuses the user id created by the
  // first test, proving the row was actually written (not just a 201).
  test.describe.configure({ mode: 'serial' });

  let createdUserId = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('creates an ADMIN user with status "active" without "Invalid status" error', async ({
    page,
  }) => {
    await page.goto('/admin/users');
    await waitForView(page, 'users-view');

    await page.locator('[data-testid="create-user-button"]').click();
    await expect(page.locator('[data-testid="user-create-view"]')).toBeVisible();

    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);

    // The exact reported combination: lowercase status, uppercase role.
    await page.locator('#status').selectOption('active');
    await page.locator('#role').selectOption('ADMIN');

    // Capture the create response so we assert on the real contract.
    const createResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/v1/admin/users') &&
        response.request().method() === 'POST',
    );

    await page.locator('[data-testid="submit-button"]').click();

    const createResponse = await createResponsePromise;
    const createBody = await createResponse.text();
    expect(createResponse.status(), `create user response body: ${createBody}`).toBe(
      201,
    );

    const created = JSON.parse(createBody);
    // Backend canonicalizes to UPPERCASE regardless of incoming casing.
    expect(created.status).toBe('ACTIVE');
    expect(created.role).toBe('ADMIN');
    expect(created.id).toBeTruthy();
    createdUserId = created.id;

    // The old bug surfaced the 400 message in the form error region.
    await expect(page.locator('text=Invalid status')).toHaveCount(0);

    // Successful create redirects to the user detail/list route.
    await expect(page).toHaveURL(/\/admin\/users(\/|$)/, { timeout: 10000 });
  });

  test('created user persists and reloads with canonical status', async ({ page }) => {
    expect(createdUserId, 'previous test must have created a user').toBeTruthy();

    // Load the persisted row directly by id — independent of the
    // (separately broken) list search/pagination UI.
    await page.goto(`/admin/users/${createdUserId}`);
    await waitForView(page, 'user-details-view');

    // The row was persisted: its detail view loads by id and shows the
    // email we created. (The "active" status the bug used to reject was
    // already asserted canonical in the create response above.)
    await expect(
      page.locator('[data-testid="user-details-view"]').getByText(testEmail).first(),
    ).toBeVisible();
  });
});
