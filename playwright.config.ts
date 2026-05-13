import { defineConfig, devices } from '@playwright/test';

// Use docker container URL if E2E_BASE_URL is set, otherwise use dev server
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5174';
const useDevServer = !process.env.E2E_BASE_URL;

export default defineConfig({
  // Host-app tests live under vue/tests/e2e; each plugin owns its own
  // tests/e2e/ folder (SOLID — plugins ship with their own coverage).
  testDir: '.',
  testMatch: [
    'vue/tests/e2e/**/*.spec.ts',
    'plugins/*/tests/e2e/**/*.spec.ts',
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start dev server if not using external URL
  ...(useDevServer ? {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  } : {}),
});
