/**
 * S41 — typing "fill the SEO fields" must populate the SEO block.
 *
 * Default panel action is now `freeform`, so a free-typed prompt fills whatever
 * the instruction asks for (the article action's schema had no SEO fields, so
 * the SEO block stayed empty before). Screenshots into
 * docs/dev_log/.../walkthrough/s41-seo-shots/.
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SHOTS =
  process.env.S41_SEO_SHOTS ||
  '/Users/dantweb/dantweb/vbwd-sdk-2/docs/dev_log/20260613/walkthrough/s41-seo-shots';
const ADMIN = { email: 'admin@example.com', password: 'AdminPass123@' };

fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(SHOTS, name), fullPage: false });

async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"], input#username, [data-testid="username-input"]').first().fill(ADMIN.email);
  await page.locator('input[type="password"], input#password, [data-testid="password-input"]').first().fill(ADMIN.password);
  await page.locator('button[type="submit"], [data-testid="login-button"]').first().click();
  await page.waitForURL(/dashboard|\/admin\/?$/, { timeout: 20000 });
  await page.waitForTimeout(1000);
}

async function spaNavigate(page: Page, target: string) {
  await page.evaluate((t) => {
    window.history.pushState({}, '', t);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, target);
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

async function openAiPanel(page: Page) {
  const prompt = page.locator('[data-testid="cms-ai-prompt"]');
  const summary = page.locator('[data-testid="cms-ai-panel"] summary').first();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await prompt.isVisible().catch(() => false)) return;
    await summary.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const d = document.querySelector('[data-testid="cms-ai-panel"]') as HTMLDetailsElement | null;
      if (d) { d.open = true; d.dispatchEvent(new Event('toggle')); }
    });
    await page.waitForTimeout(400);
  }
  await prompt.waitFor({ state: 'visible', timeout: 5000 });
}

test.describe('S41 — fill the SEO fields from a free prompt', () => {
  test.setTimeout(180000);

  test('typing "fill the SEO fields" populates the SEO block', async ({ page }) => {
    page.on('response', (r) => {
      if (r.url().includes('/plugins/cms-ai/generate')) console.log(`[res] ${r.status()} ${r.url()}`);
    });
    await loginAsAdmin(page);

    await spaNavigate(page, '/admin/cms/posts/new');
    await page.locator('[data-testid="post-title"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('[data-testid="post-type"]').selectOption('post').catch(() => undefined);
    await page.waitForTimeout(300);
    await page.locator('[data-testid="post-title"]').fill('VBWD Analytics — Privacy-First Alternative');
    await page.locator('[data-testid="post-excerpt"]').fill('A privacy-first, self-hosted analytics platform.');

    // No menu action selected -> default 'freeform'. Free-type the SEO request.
    await openAiPanel(page);
    await page.locator('[data-testid="cms-ai-prompt"]').fill('fill the SEO fields');
    await shot(page, 'step-1-prompt.png');

    const genResp = page.waitForResponse(
      (r) => r.url().includes('/plugins/cms-ai/generate') && r.request().method() === 'POST',
      { timeout: 120000 },
    );
    await page.locator('[data-testid="cms-ai-generate"]').click();
    const gen = await genResp;
    expect(gen.status(), 'generate must return 200').toBe(200);
    const body = await gen.json().catch(() => ({} as Record<string, unknown>));
    const patch = (body.patch || {}) as Record<string, string>;
    // The fix: the SEO fields are populated by a free prompt.
    expect(patch.meta_title, 'meta_title must be filled').toBeTruthy();
    expect(patch.meta_description, 'meta_description must be filled').toBeTruthy();

    // bring the SEO inputs into view and screenshot them populated
    await page.waitForTimeout(600);
    await page.locator('[data-testid="seo-meta-title"]').scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(400);
    await expect(page.locator('[data-testid="seo-meta-title"]')).not.toHaveValue('');
    await expect(page.locator('[data-testid="seo-meta-description"]')).not.toHaveValue('');
    await shot(page, 'step-2-seo-fields-filled.png');

    fs.writeFileSync(
      path.join(SHOTS, 'proof.json'),
      JSON.stringify(
        {
          status: gen.status(),
          model: body.model,
          patch_keys: Object.keys(patch),
          meta_title: patch.meta_title,
          meta_description: patch.meta_description,
        },
        null,
        2,
      ),
    );
  });
});
