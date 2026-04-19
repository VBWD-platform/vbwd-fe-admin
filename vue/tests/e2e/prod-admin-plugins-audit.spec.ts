import { test, expect } from '@playwright/test';

/**
 * Production audit of which admin plugins are actually active on vbwd.cc/admin.
 *
 * Two sources of truth, both checked:
 *   1. /admin/plugins.json — the manifest served by nginx
 *   2. Console logs from the running pluginLoader — what actually loaded
 *
 * Run: E2E_BASE_URL=https://vbwd.cc npx playwright test prod-admin-plugins-audit
 */

const EXPECTED_ENABLED = [
  'analytics-widget',
  'subscription-admin',
  'cms-admin',
  'email-admin',
  'taro-admin',
];

test.describe('vbwd.cc/admin — plugin audit', () => {
  test('/admin/plugins.json lists expected enabled plugins', async ({ request }) => {
    const response = await request.get('/admin/plugins.json');
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.plugins).toBeTruthy();

    const enabledPluginNames = Object.entries(manifest.plugins)
      .filter(([, cfg]: [string, unknown]) => (cfg as { enabled: boolean }).enabled)
      .map(([name]) => name)
      .sort();

    expect.soft(enabledPluginNames).toEqual([...EXPECTED_ENABLED].sort());
  });

  test('pluginLoader actually loads the enabled plugins (console audit)', async ({ page }) => {
    const loadedPluginNames: string[] = [];
    const skippedPluginNames: string[] = [];
    const pluginErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      // "[PluginRegistry] Loaded enabled plugin: <name> (v<ver>)"
      const loadedMatch = text.match(/Loaded enabled plugin:\s*([\w-]+)/);
      if (loadedMatch) loadedPluginNames.push(loadedMatch[1]);

      const skippedMatch = text.match(/Skipping disabled plugin:\s*([\w-]+)/);
      if (skippedMatch) skippedPluginNames.push(skippedMatch[1]);

      if (msg.type() === 'error' && /plugin/i.test(text)) {
        pluginErrors.push(text);
      }
    });
    page.on('pageerror', (error) => {
      if (/plugin/i.test(error.message)) pluginErrors.push(error.message);
    });

    await page.goto('/admin/', { waitUntil: 'networkidle' });

    // Log for operator visibility (appears in Playwright report)
    console.log('[AUDIT] Loaded plugins:', loadedPluginNames);
    console.log('[AUDIT] Skipped plugins:', skippedPluginNames);
    console.log('[AUDIT] Plugin errors:', pluginErrors);

    expect(pluginErrors, pluginErrors.join('\n')).toHaveLength(0);

    for (const expectedName of EXPECTED_ENABLED) {
      expect.soft(
        loadedPluginNames,
        `expected plugin "${expectedName}" to be loaded; got: ${loadedPluginNames.join(', ')}`,
      ).toContain(expectedName);
    }
  });

  test('cms-admin plugin backend endpoint reachable (if auth-gated, expect 401 not 404)', async ({ request }) => {
    // Unauthenticated probe — the endpoint should exist (401/403) rather than 404.
    const response = await request.get('/api/v1/admin/cms/pages', {
      failOnStatusCode: false,
    });
    expect.soft(
      [401, 403],
      `GET /api/v1/admin/cms/pages returned ${response.status()} — if 404 the backend cms plugin is not registered`,
    ).toContain(response.status());
  });
});
