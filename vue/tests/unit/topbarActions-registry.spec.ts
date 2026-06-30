/**
 * `topbarActions` extension slot — right-aligned, plugin-injectable admin topbar.
 *
 * Mirrors the other extension slots: plugins (CMS contributes a "Home" link)
 * inject self-contained components into the core AdminTopbar without core
 * naming any plugin. Actions are returned sorted by `order` (default 100).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent } from 'vue';
import { extensionRegistry } from '@/plugins/extensionRegistry';

const Stub = defineComponent({ template: '<a />' });

describe('extensionRegistry.topbarActions', () => {
  beforeEach(() => {
    extensionRegistry.clear();
  });

  it('exposes a getTopbarActions() accessor', () => {
    expect(typeof extensionRegistry.getTopbarActions).toBe('function');
    expect(extensionRegistry.getTopbarActions()).toEqual([]);
  });

  it('returns actions contributed by plugins', () => {
    extensionRegistry.register('cms-admin', {
      topbarActions: [
        { id: 'cms-home', component: Stub, requiredPermission: 'cms.manage' },
      ],
    });

    const actions = extensionRegistry.getTopbarActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe('cms-home');
    expect(actions[0].requiredPermission).toBe('cms.manage');
  });

  it('sorts actions by order (default 100)', () => {
    extensionRegistry.register('a', {
      topbarActions: [{ id: 'late', component: Stub, order: 200 }],
    });
    extensionRegistry.register('b', {
      topbarActions: [{ id: 'early', component: Stub, order: 10 }],
    });
    extensionRegistry.register('c', {
      topbarActions: [{ id: 'default', component: Stub }],
    });

    const ids = extensionRegistry.getTopbarActions().map((action) => action.id);
    expect(ids).toEqual(['early', 'default', 'late']);
  });
});
