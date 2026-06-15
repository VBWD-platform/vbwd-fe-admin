/**
 * S41 — reproduce + verify the "write a post" empty-context case.
 *
 * The operator opens a NEW post (empty title/excerpt/body) and asks the AI to
 * "write a post". Previously the model returned literal "<UNKNOWN>" placeholders;
 * after the prompt fix it must generate real, publishable content. Captures
 * screenshots into docs/dev_log/.../walkthrough/s41-article-shots/.
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SHOTS =
  process.env.S41_ART_SHOTS ||
  '/Users/dantweb/dantweb/vbwd-sdk-2/docs/dev_log/20260613/walkthrough/s41-article-shots';
const ADMIN = { email: 'admin@example.com', password: 'AdminPass123@' };

fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(SHOTS, name), fullPage: false });

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

test.describe('S41 — write a post from an empty editor', () => {
  test.setTimeout(180000);

  test('generates real content (no <UNKNOWN> placeholders)', async ({ page }) => {
    page.on('response', (r) => {
      if (r.url().includes('/plugins/cms-ai/generate')) console.log(`[res] ${r.status()} ${r.url()}`);
    });
    await loginAsAdmin(page);

    await spaNavigate(page, '/admin/cms/posts/new');
    await page.locator('[data-testid="post-title"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('[data-testid="post-type"]').selectOption('post').catch(() => undefined);
    await page.waitForTimeout(300);

    // Empty editor (no title/excerpt/body) — exactly the reported case.
    await openAiPanel(page);
    await page.locator('[data-testid="cms-ai-prompt"]').fill('write a post');
    await shot(page, 'step-1-prompt-empty-editor.png');

    const genResp = page.waitForResponse(
      (r) => r.url().includes('/plugins/cms-ai/generate') && r.request().method() === 'POST',
      { timeout: 120000 },
    );
    await page.locator('[data-testid="cms-ai-generate"]').click();
    const gen = await genResp;
    expect(gen.status(), 'generate must return 200').toBe(200);
    const body = await gen.json().catch(() => ({} as Record<string, unknown>));
    const patch = (body.patch || {}) as Record<string, string>;
    // Hard proof of the fix: real content, not placeholders.
    expect(patch.content_html, 'content_html must be populated').toBeTruthy();
    for (const [k, v] of Object.entries(patch)) {
      expect(String(v), `${k} must not be a placeholder`).not.toMatch(/<UNKNOWN>|^TODO$|^N\/A$/i);
    }
    expect((patch.content_html || '').length, 'content_html should be substantial').toBeGreaterThan(200);

    await page.waitForTimeout(800);
    await shot(page, 'step-2-title-excerpt-filled.png');
    // show the generated HTML body
    await page.locator('[data-testid="content-tab"]', { hasText: 'HTML' }).click().catch(() => undefined);
    await page.waitForTimeout(600);
    await shot(page, 'step-3-content-html-filled.png');

    fs.writeFileSync(
      path.join(SHOTS, 'proof.json'),
      JSON.stringify(
        {
          status: gen.status(),
          model: body.model,
          provider: body.provider,
          patch_keys: Object.keys(patch),
          title: patch.title,
          content_html_len: (patch.content_html || '').length,
        },
        null,
        2,
      ),
    );
  });
});
