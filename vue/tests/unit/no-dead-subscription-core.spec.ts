/**
 * Agnosticism fence (Sprint 02, Phase 0).
 *
 * The subscription admin experience is owned by
 * `plugins/subscription-admin/`. The pre-extraction duplicate *views* in
 * fe-admin core were unreachable (core router registers none of them; the
 * plugin registers its own `./src/views/*`) and were deleted.
 *
 * Deliberately NOT asserted here (these are LIVE, not dead — verified via
 * vue-tsc: the subscription-admin plugin imports them through the core
 * `@/` alias, so they are shared core capabilities, not Phase 0 dead
 * duplicates — their decoupling is Phase 1):
 *   - stores/planAdmin.ts, stores/addons.ts, stores/categoryAdmin.ts
 *   - components/CategoriesTab.vue
 *   - stores/subscriptions.ts (live via UserEdit.vue — Sprint 08)
 */
import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, it, expect } from 'vitest'

const SRC = resolve(__dirname, '../../src')

const DEAD_VIEWS = [
  'views/Plans.vue',
  'views/PlanForm.vue',
  'views/Subscriptions.vue',
  'views/SubscriptionDetails.vue',
  'views/SubscriptionCreate.vue',
  'views/AddOns.vue',
  'views/AddonForm.vue',
  'views/CategoryForm.vue',
]

describe('fe-admin core — no dead subscription duplicate views', () => {
  it.each(DEAD_VIEWS)(
    'core file %s no longer exists (plugin owns ./src/views/*)',
    (relPath) => {
      expect(existsSync(resolve(SRC, relPath))).toBe(false)
    },
  )

  it('router registers none of the deleted subscription views', () => {
    const router = readFileSync(resolve(SRC, 'router/index.ts'), 'utf8')
    for (const view of DEAD_VIEWS) {
      const name = view.replace('views/', '').replace('.vue', '')
      expect(router).not.toMatch(new RegExp(`views/${name}\\.vue`))
    }
  })
})
