/**
 * Sprint 09 (FE) — Subscription-agnosticism oracle for the core admin app.
 *
 * The 2026-03-27 extraction made *subscription* a plugin peer of cms / ghrm.
 * This test is the automated acceptance gate (E3) for the fe-admin half: it
 * fences the contract that core fe-admin owns NO subscription store, routes,
 * views, or business logic. All subscription UI is contributed by the
 * subscription-admin plugin through the extension registry.
 *
 * Allowed residuals (decision-locked — NOT violations):
 *  - D4: invoices stay core, so an invoice DTO may carry optional
 *    `subscription_*` metadata and InvoiceDetails may display it (the FE
 *    mirror of subscription *models* staying in core on the backend).
 *  - Backend API contract: `/admin/users/:id/deletion-info` returns a named
 *    `subscription_count`; decoupling it needs a generic `dependencies[]`
 *    payload (a backend sprint), not a fe extension point.
 *
 * If this test fails, core has re-acquired a subscription coupling — move it
 * to the subscription-admin plugin instead of relaxing the assertions.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const SRC = resolve(__dirname, '../../src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|vue)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const allCoreFiles = walk(SRC);
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

describe('core fe-admin is subscription-agnostic (Sprint 09 oracle)', () => {
  it('owns no subscription Pinia store', () => {
    expect(existsSync(join(SRC, 'stores/subscriptions.ts'))).toBe(false);
    expect(existsSync(join(SRC, 'stores/planAdmin.ts'))).toBe(false);
    expect(existsSync(join(SRC, 'stores/addons.ts'))).toBe(false);
  });

  it('owns no subscription views', () => {
    for (const view of [
      'views/Subscriptions.vue',
      'views/SubscriptionDetails.vue',
      'views/Plans.vue',
      'views/PlanForm.vue',
      'views/AddOns.vue',
    ]) {
      expect(existsSync(join(SRC, view))).toBe(false);
    }
  });

  it('no core file imports a subscription store or the subscription plugin', () => {
    const offenders: string[] = [];
    for (const file of allCoreFiles) {
      const text = readFileSync(file, 'utf8');
      if (
        /from\s+['"][^'"]*stores\/subscriptions['"]/.test(text) ||
        /from\s+['"][^'"]*stores\/planAdmin['"]/.test(text) ||
        /from\s+['"][^'"]*stores\/addons['"]/.test(text) ||
        /subscription-admin/.test(text)
      ) {
        offenders.push(file.replace(SRC, 'src'));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('core router registers no subscription routes', () => {
    const router = read('router/index.ts');
    expect(router).not.toMatch(/\/subscriptions/);
    expect(router).not.toMatch(/\/plans/);
    expect(router).not.toMatch(/\/add-ons/);
    expect(router).not.toMatch(/subscription/i);
  });

  it('UserEdit delegates Subscriptions/Add-ons to plugin tabs (no store coupling)', () => {
    const userEdit = read('views/UserEdit.vue');
    expect(userEdit).not.toMatch(/useSubscriptionsStore/);
    expect(userEdit).not.toMatch(/stores\/subscriptions/);
    // It renders plugin-contributed tabs via the registry instead.
    expect(userEdit).toMatch(/getUserEditTabs/);
  });

  it('the extension registry exposes the subscription decoupling points', () => {
    const registry = read('plugins/extensionRegistry.ts');
    for (const hook of [
      'getUserEditTabs',
      'getUserDetailsSections',
      'getAccessLevelTabs',
      'getAccessLevelFormFields',
      'getAccessLevelUserColumns',
    ]) {
      expect(registry).toContain(hook);
    }
  });

  it('AccessLevels / AccessLevelForm name no subscription field', () => {
    expect(read('views/AccessLevels.vue')).not.toMatch(/linked_plan_slug/);
    // The form loads/saves plugin fields generically; only a doc comment may
    // mention the example field name.
    const form = read('views/AccessLevelForm.vue')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(form).not.toMatch(/linked_plan_slug/);
  });
});
