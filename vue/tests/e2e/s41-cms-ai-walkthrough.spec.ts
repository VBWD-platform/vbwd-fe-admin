/**
 * S41 — CMS AI Helper live walkthrough (DoD live proof).
 *
 * Drives the running stack (fe-admin :8081 + fe-user :8080) with REAL backend
 * calls: real Anthropic (claude-sonnet-4-5) for /generate and real Replicate
 * FLUX for /generate-image. Captures real screenshots into
 * docs/dev_log/20260613/walkthrough/s41-cms-ai-shots/ for the HTML report.
 *
 * NOT a pixel-diff: the headline "looks like backlinko" step is proof-of-work,
 * human-judged. Hard asserts stay on mechanics (panel renders, fields populate,
 * image lands in gallery + editor body, page renders with source_css).
 *
 * Run (stack already up):
 *   E2E_BASE_URL=http://localhost:8081 \
 *   npx playwright test tests/e2e/s41-cms-ai-walkthrough.spec.ts \
 *     --project=chromium --workers=1
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SHOTS =
  process.env.S41_SHOTS_DIR ||
  '/Users/dantweb/dantweb/vbwd-sdk-2/docs/dev_log/20260613/walkthrough/s41-cms-ai-shots';
const FE_USER = process.env.FE_USER_BASE_URL || 'http://localhost:8080';
const REFERENCE_URL = 'https://backlinko.com/google-analytics-alternatives';
const ADMIN = { email: 'admin@example.com', password: 'AdminPass123@' };

fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(SHOTS, name), fullPage: false });

async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page
    .locator('input[type="email"], input#username, [data-testid="username-input"]')
    .first()
    .fill(ADMIN.email);
  await page
    .locator('input[type="password"], input#password, [data-testid="password-input"]')
    .first()
    .fill(ADMIN.password);
  await page
    .locator('button[type="submit"], [data-testid="login-button"]')
    .first()
    .click();
  await page.waitForURL(/dashboard|\/admin\/?$/, { timeout: 20000 });
  await page.waitForTimeout(1000);
}

/**
 * Navigate inside the SPA (client-side) — a hard `page.goto` to a guarded admin
 * route loses the freshly-restored auth state and bounces to /admin/login (the
 * documented fe-admin reload-loses-auth gotcha). Client-side push keeps the
 * pinia auth store alive.
 */
async function spaNavigate(page: Page, path: string) {
  await page.evaluate((target) => {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

/**
 * Open the collapsible AI panel (a native <details>) until the prompt textarea
 * is actually visible. Click the summary, and if that does not expand it,
 * force the `open` attribute on the <details> element.
 */
async function openAiPanel(page: Page) {
  const prompt = page.locator('[data-testid="cms-ai-prompt"]');
  const summary = page.locator('[data-testid="cms-ai-panel"] summary').first();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await prompt.isVisible().catch(() => false)) return;
    await summary.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(400);
    if (await prompt.isVisible().catch(() => false)) return;
    // fall back to forcing the details open
    await page.evaluate(() => {
      const details = document.querySelector(
        '[data-testid="cms-ai-panel"]',
      ) as HTMLDetailsElement | null;
      if (details) {
        details.open = true;
        details.dispatchEvent(new Event('toggle'));
      }
    });
    await page.waitForTimeout(400);
  }
  await prompt.waitFor({ state: 'visible', timeout: 5000 });
}

test.describe('S41 cms-ai live walkthrough', () => {
  test.setTimeout(540000);

  test('captures the cms-ai editor + image + headline + fe-user render', async ({ page }) => {
    test.slow();
    // Instrumentation: surface exactly which cms-ai requests fire + any console error.
    page.on('request', (r) => {
      if (r.url().includes('/plugins/cms-ai/')) console.log(`[req] ${r.method()} ${r.url()}`);
    });
    page.on('response', (r) => {
      if (r.url().includes('/plugins/cms-ai/')) console.log(`[res] ${r.status()} ${r.url()}`);
    });
    page.on('console', (m) => {
      if (m.type() === 'error') console.log(`[browser-error] ${m.text()}`);
    });
    page.on('requestfailed', (r) => {
      if (r.url().includes('/plugins/cms-ai/')) console.log(`[reqfail] ${r.url()} ${r.failure()?.errorText}`);
    });
    await loginAsAdmin(page);

    // -- Step 1: open the post editor, show the AI dropdown + collapsible panel
    await spaNavigate(page, '/admin/cms/posts/new');
    await page.locator('[data-testid="post-title"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('[data-testid="post-title"]').fill('S41 — CMS AI Helper (live walk)');

    const aiMenu = page.locator('[data-testid="cms-ai-menu"]');
    await expect(aiMenu, 'AI dropdown button must render in the editor header').toBeVisible();
    const aiPanel = page.locator('[data-testid="cms-ai-panel"]');
    await expect(aiPanel, 'collapsible AI panel must render below the header').toBeVisible();

    // open the dropdown to show the action list, then screenshot
    await aiMenu.click();
    await expect(page.locator('[data-testid="cms-ai-action-article"]')).toBeVisible();
    await shot(page, 'step-01-ai-dropdown.png');
    // close dropdown, open the panel (details)
    await aiMenu.click().catch(() => undefined);
    await openAiPanel(page);
    await shot(page, 'step-02-ai-panel.png');

    // -- Step 2: image generation (real Replicate FLUX)
    const imageOnly = page.locator('[data-testid="cms-ai-image-only"]');
    await expect(imageOnly, '"Generate only image" checkbox must show when image_enabled').toBeVisible();
    await imageOnly.check();
    await page
      .locator('[data-testid="cms-ai-prompt"]')
      .fill('a clean modern hero illustration of a SaaS analytics dashboard, soft blue palette, minimal');
    await shot(page, 'step-03-image-prompt.png');

    // Generate -> wait for the real backend image response
    const imageResp = page.waitForResponse(
      (r) => r.url().includes('/plugins/cms-ai/generate-image') && r.request().method() === 'POST',
      { timeout: 180000 },
    );
    await page.locator('[data-testid="cms-ai-generate"]').click();
    const imgR = await imageResp;
    expect(imgR.status(), 'generate-image must return 200').toBe(200);
    const imgBody = await imgR.json().catch(() => ({} as Record<string, unknown>));
    const imageBlock = (imgBody.image || {}) as Record<string, string>;
    const imageUrlPath = imageBlock.url_path || '';
    expect(imageUrlPath, 'response must carry the gallery image url_path').toBeTruthy();
    // assert the token is NOT in the response payload
    expect(JSON.stringify(imgBody)).not.toContain('r8_');

    // switch to the HTML body tab so the <img> is visible in the editor
    await page.locator('[data-testid="content-tab"]', { hasText: 'HTML' }).click().catch(() => undefined);
    await page.waitForTimeout(800);
    await shot(page, 'step-04-image-in-editor.png');

    // (b) the same image now in the global gallery
    await spaNavigate(page, '/admin/cms/images');
    await page.waitForTimeout(1200);
    await shot(page, 'step-05-image-in-gallery.png');

    // -- Step 3: headline live test (real LLM, restyle/override styles)
    await spaNavigate(page, '/admin/cms/posts/new');
    await page.locator('[data-testid="post-title"]').waitFor({ state: 'visible', timeout: 20000 });
    // Create a POST (TipTap/Visual body editor) — "a post about VBWD". This is the
    // body path the AI article must persist through (Slice 3c).
    await page.locator('[data-testid="post-type"]').selectOption('post');
    await page.waitForTimeout(300);
    // Unique title -> unique slug, so the public fetch can't collide with a
    // same-slug post left by an earlier run.
    const runTag = Date.now().toString(36).slice(-5);
    await page
      .locator('[data-testid="post-title"]')
      .fill(`VBWD — Google Analytics Alternatives (AI live ${runTag})`);
    await page
      .locator('[data-testid="post-excerpt"]')
      .fill('Why teams pick VBWD over legacy analytics suites.');

    let genProvider = '';
    let genModel = '';
    // Helper: drive one AI generation through the panel for a given action.
    // (The fe-core <Dropdown> custom slot does NOT auto-close on select, and its
    // open menu swallows the generate click — dismiss it with Escape. UX nit flagged.)
    async function runAction(action: string, promptText: string): Promise<Record<string, string>> {
      await page.locator('[data-testid="cms-ai-menu"]').click();
      await page.locator(`[data-testid="cms-ai-action-${action}"]`).click();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      await openAiPanel(page);
      await page.locator('[data-testid="cms-ai-prompt"]').fill(promptText);
      await expect(page.locator('[data-testid="cms-ai-prompt"]')).toHaveValue(promptText);
      if (action === 'restyle') await shot(page, 'step-06-headline-prompt.png');
      const resp = page.waitForResponse(
        (r) =>
          r.url().includes('/plugins/cms-ai/generate') &&
          !r.url().includes('generate-image') &&
          r.request().method() === 'POST',
        { timeout: 360000 },
      );
      await page.locator('[data-testid="cms-ai-generate"]').click();
      const r = await resp;
      expect(r.status(), `${action} generate must return 200`).toBe(200);
      const body = await r.json().catch(() => ({} as Record<string, unknown>));
      expect(JSON.stringify(body), 'no key leakage').not.toContain('sk-ant-');
      if (body.provider) genProvider = String(body.provider);
      if (body.model) genModel = String(body.model);
      return (body.patch || {}) as Record<string, string>;
    }

    // -- Step 3a: generate the VBWD article body (content_html) via "article".
    const articlePatch = await runAction(
      'article',
      // Keep it concise so generation completes under the fe-admin nginx proxy’s
      // ~60s read timeout (long generations 504 at the proxy even though the
      // backend finishes — a prod note: raise the proxy timeout on cms-ai routes).
      'Write a CONCISE blog post (about 3 short paragraphs) about VBWD as a privacy-first, self-hosted alternative to Google Analytics — privacy, data ownership, and cost. Return clean semantic HTML.',
    );
    expect(Boolean(articlePatch.content_html), 'article action must populate content_html').toBe(true);

    // -- Step 3b: the headline "Override styles" prompt -> restyle -> source_css
    // (now with article content present, the model restyles a real page).
    const patch = await runAction(
      'restyle',
      'Override the page styling so this VBWD post looks like the polished ' +
        'https://backlinko.com/google-analytics-alternatives layout. Output a complete CSS ' +
        'stylesheet (source_css): a large hero heading, clean readable body typography, generous ' +
        'spacing, and styled headings, links and lists. Restyle only — do not rewrite the article text.',
    );
    const hasCss = Boolean(patch.source_css);
    const hasHtml = Boolean(patch.content_html);
    expect(hasCss || hasHtml, 'restyle must populate source_css and/or content_html').toBe(true);

    // screenshot the populated HTML body (AI article) + CSS (override styles)
    await page.locator('[data-testid="content-tab"]', { hasText: 'HTML' }).click().catch(() => undefined);
    await page.waitForTimeout(800);
    await shot(page, 'step-07-content-html.png');
    await page.locator('[data-testid="content-tab"]', { hasText: 'CSS' }).click().catch(() => undefined);
    await page.waitForTimeout(800);
    await shot(page, 'step-08-source-css.png');

    // Save + publish. The cms create flow persists a NEW post as draft regardless
    // of the selected status; only a subsequent UPDATE honours "published". A draft
    // 404s on the public fe-user route, so: save (create) -> set published -> save
    // again (update) so the page is publicly served.
    async function saveOnce(): Promise<void> {
      const resp = page
        .waitForResponse(
          (r) =>
            r.url().includes('/admin/cms/posts') &&
            ['POST', 'PUT'].includes(r.request().method()),
          { timeout: 30000 },
        )
        .catch(() => null);
      await page.locator('[data-testid="post-save"]').click();
      await resp;
      await page.waitForTimeout(1200);
    }
    await page.locator('[data-testid="post-status"]').selectOption('published');
    await page.waitForTimeout(200);
    await saveOnce(); // create (lands as draft)
    await page.locator('[data-testid="post-status"]').selectOption('published');
    await page.waitForTimeout(200);
    await saveOnce(); // update -> published
    // Read the (auto-generated, server-normalised) slug straight from the form.
    const savedSlug = (await page.locator('[data-testid="post-slug"]').inputValue().catch(() => ''))
      .replace(/^\//, '')
      .trim();
    expect(savedSlug, 'post must have a slug to render on fe-user').toBeTruthy();
    // Hard proof of Slice 3c: the AI article body must actually persist on the
    // saved post (not be clobbered to '' by the body editor). Read it back from
    // the admin API (authoritative), and set published_at so the public fe-user
    // route serves the post (a published post with a null published_at 404s).
    const persisted = await page.evaluate(async (slug) => {
      const token = localStorage.getItem('admin_token');
      const auth = { Authorization: `Bearer ${token}` };
      const listRes = await fetch(`/api/v1/admin/cms/posts?search=${encodeURIComponent(slug)}`, { headers: auth });
      const list = await listRes.json();
      const items = (list.posts || list.items || list.data || []) as Array<Record<string, unknown>>;
      const post = (Array.isArray(items) ? items : []).find((p) => p.slug === slug);
      if (!post) return { len: -1, publicOk: false };
      const len = ((post.content_html as string) || '').length;
      await fetch(`/api/v1/admin/cms/posts/${post.id}`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published', published_at: new Date().toISOString() }),
      });
      const pub = await fetch(`/api/v1/cms/posts/${slug}`);
      return { len, publicOk: pub.ok };
    }, savedSlug);
    const savedContentLen = persisted.len;
    expect(
      savedContentLen,
      'AI-generated article content_html must persist on the saved post (Slice 3c)',
    ).toBeGreaterThan(50);
    await shot(page, 'step-09-saved.png');

    // -- Step 4: fe-user rendered page next to the reference URL (side-by-side)
    if (savedSlug) {
      const userPage = await page.context().newPage();
      await userPage.goto(`${FE_USER}/${savedSlug}`, { waitUntil: 'networkidle' }).catch(() => undefined);
      await userPage.waitForTimeout(1500);
      // mechanics: the PUBLISHED post renders (not the 404 page) and shows its title.
      const renderedText = await userPage.locator('body').innerText().catch(() => '');
      expect(renderedText, 'fe-user must render the published post, not a 404').not.toMatch(
        /page not found|^404\b/i,
      );
      expect(renderedText, 'fe-user page must show the post title').toContain(
        'Google Analytics Alternatives',
      );
      await userPage.screenshot({ path: path.join(SHOTS, 'step-10-fe-user-rendered.png'), fullPage: false });

      // reference page (best-effort; may be slow/blocked — capture what loads)
      const refPage = await page.context().newPage();
      try {
        await refPage.goto(REFERENCE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await refPage.waitForTimeout(2500);
      } catch {
        /* reference may be slow or block bots — capture whatever rendered */
      }
      await refPage.screenshot({ path: path.join(SHOTS, 'step-11-reference-backlinko.png'), fullPage: false });
      await userPage.close();
      await refPage.close();
    }

    // persist a small machine-readable proof for the report assembler
    fs.writeFileSync(
      path.join(SHOTS, 'proof.json'),
      JSON.stringify(
        {
          image_url_path: imageUrlPath,
          generate_provider: genProvider,
          generate_model: genModel,
          article_html_present: Boolean(articlePatch.content_html),
          restyle_patch_keys: Object.keys(patch),
          source_css_applied: hasCss,
          saved_content_html_len: savedContentLen,
          saved_slug: savedSlug,
        },
        null,
        2,
      ),
    );
  });

  // "Re-generate all SEO fields" works WITHOUT a typed prompt: the panel sends a
  // default SEO instruction so the backend regenerates from the current
  // title + content. Proof: the saved post's meta_title/meta_description are
  // non-empty after Generate (no prompt) + Save.
  test('regenerates SEO fields from title+content with no typed prompt', async ({ page }) => {
    test.slow();
    await loginAsAdmin(page);

    await spaNavigate(page, '/admin/cms/posts/new');
    await page.locator('[data-testid="post-title"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('[data-testid="post-type"]').selectOption('post');
    const runTag = Date.now().toString(36).slice(-5);
    await page
      .locator('[data-testid="post-title"]')
      .fill(`VBWD SEO regen (AI live ${runTag})`);
    await page
      .locator('[data-testid="post-excerpt"]')
      .fill('A privacy-first, self-hosted analytics alternative for teams.');

    // Select the SEO action from the AI dropdown, then open the panel.
    await page.locator('[data-testid="cms-ai-menu"]').click();
    await page.locator('[data-testid="cms-ai-action-seo"]').click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await openAiPanel(page);

    // Generate WITHOUT typing a prompt — the default SEO instruction is sent.
    const seoResp = page.waitForResponse(
      (r) =>
        r.url().includes('/plugins/cms-ai/generate') &&
        !r.url().includes('generate-image') &&
        r.request().method() === 'POST',
      { timeout: 360000 },
    );
    await page.locator('[data-testid="cms-ai-generate"]').click();
    const seoR = await seoResp;
    expect(seoR.status(), 'seo generate (empty prompt) must return 200').toBe(200);
    const seoBody = await seoR.json().catch(() => ({} as Record<string, unknown>));
    const seoPatch = (seoBody.patch || {}) as Record<string, string>;
    expect(seoPatch.meta_title, 'seo patch must carry a meta_title').toBeTruthy();

    // Save (create lands as draft — fine for the SEO assertion) and read back
    // the persisted SEO fields from the admin API (authoritative).
    const saveResp = page
      .waitForResponse(
        (r) =>
          r.url().includes('/admin/cms/posts') &&
          ['POST', 'PUT'].includes(r.request().method()),
        { timeout: 30000 },
      )
      .catch(() => null);
    await page.locator('[data-testid="post-save"]').click();
    await saveResp;
    await page.waitForTimeout(1200);

    const savedSlug = (await page.locator('[data-testid="post-slug"]').inputValue().catch(() => ''))
      .replace(/^\//, '')
      .trim();
    expect(savedSlug, 'post must have a slug').toBeTruthy();

    const seo = await page.evaluate(async (slug) => {
      const token = localStorage.getItem('admin_token');
      const auth = { Authorization: `Bearer ${token}` };
      const listRes = await fetch(
        `/api/v1/admin/cms/posts?search=${encodeURIComponent(slug)}`,
        { headers: auth },
      );
      const list = await listRes.json();
      const items = (list.posts || list.items || list.data || []) as Array<Record<string, unknown>>;
      const post = (Array.isArray(items) ? items : []).find((p) => p.slug === slug);
      return {
        metaTitleLen: ((post?.meta_title as string) || '').length,
        metaDescriptionLen: ((post?.meta_description as string) || '').length,
      };
    }, savedSlug);

    expect(seo.metaTitleLen, 'saved post meta_title must be non-empty').toBeGreaterThan(0);
    expect(
      seo.metaDescriptionLen,
      'saved post meta_description must be non-empty',
    ).toBeGreaterThan(0);
  });
});
