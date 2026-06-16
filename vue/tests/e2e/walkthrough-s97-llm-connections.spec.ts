import { test, expect, Page } from '@playwright/test';

// S97 — Core LLM Connection Manager: frontend walkthrough.
// Settings → "LLM Connections" → create a connection (self-seeded via the UI),
// verify the api_key renders MASKED, make it default, verify the Default badge.
// Self-contained: creates its own connection, so it needs no pre-seeded data.

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8081';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE}/admin/login`);
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 20000 });
  await page.locator('[data-testid="login-email"], input[type="email"]').first().fill('admin@example.com');
  await page.locator('[data-testid="login-password"], input[type="password"]').first().fill('AdminPass123@');
  await page.locator('[data-testid="login-button"]').click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 });
}

test('S97 — admin creates an LLM connection; key masked; make default', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' });

  const tab = page.getByTestId('tab-llm-connections');
  await expect(tab).toBeVisible({ timeout: 15000 });
  await tab.click();
  await expect(page.getByTestId('llm-connections-content')).toBeVisible({ timeout: 10000 });

  // Create a connection via the UI (self-seeding).
  const slug = `e2e-conn-${Date.now()}`;
  await page.getByTestId('llm-connection-create-btn').click();
  await expect(page.getByTestId('llm-connection-form')).toBeVisible();
  await page.getByTestId('llm-connection-new-name').fill('E2E Connection');
  await page.getByTestId('llm-connection-new-slug').fill(slug);
  await page.getByTestId('llm-connection-new-model').fill('gpt-4o-mini');
  await page.getByTestId('llm-connection-new-endpoint').fill('http://stub-llm:9099/v1');
  await page.getByTestId('llm-connection-new-key').fill('sk-e2e-EXAMPLEKEY-0123456789abcdefghijklmnop');
  await page.getByTestId('llm-connection-new-submit').click();

  // The row appears; the key is rendered masked (first 16 chars + ellipsis, never full).
  const nameCell = page.getByText('E2E Connection', { exact: false }).first();
  await expect(nameCell).toBeVisible({ timeout: 10000 });
  const row = page.locator('[data-testid^="llm-connection-row-"]', { hasText: 'E2E Connection' });
  const keyCell = row.locator('[data-testid^="llm-connection-key-"]');
  const keyText = (await keyCell.innerText()).trim();
  expect(keyText).toContain('sk-e2e-EXAMPLEK'); // first 16 shown
  expect(keyText).not.toContain('abcdefghijklmnop'); // tail hidden
  expect(keyText).toMatch(/[….]/); // masked marker

  // Make it the default → the Default badge renders on this row.
  await row.locator('[data-testid^="llm-connection-make-default-"]').click();
  await expect(row.getByTestId('llm-connection-default-badge')).toBeVisible({ timeout: 10000 });

  await page.screenshot({ path: 'test-results/s97-llm-connections-walkthrough.png', fullPage: true });
});
