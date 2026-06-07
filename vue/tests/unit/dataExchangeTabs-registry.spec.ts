/**
 * S46.4 — `dataExchangeTabs` extension slot (R7).
 *
 * Mirrors `userEditTabs` / `accessLevelTabs`: plugins (CMS in S46.5) contribute
 * tabs to the Settings → Import/Export page without core naming any plugin.
 * Tabs are returned sorted by `order` (default 100, like userEditTabs).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent } from 'vue';
import { extensionRegistry } from '@/plugins/extensionRegistry';

const Stub = defineComponent({ template: '<div />' });

describe('extensionRegistry.dataExchangeTabs', () => {
  beforeEach(() => {
    extensionRegistry.clear();
  });

  it('exposes a getDataExchangeTabs() accessor', () => {
    expect(typeof extensionRegistry.getDataExchangeTabs).toBe('function');
    expect(extensionRegistry.getDataExchangeTabs()).toEqual([]);
  });

  it('returns tabs contributed by plugins', () => {
    extensionRegistry.register('cms-admin', {
      dataExchangeTabs: [
        { id: 'cms', label: 'CMS', component: Stub, requiredPermission: 'cms.export' },
      ],
    });

    const tabs = extensionRegistry.getDataExchangeTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe('cms');
    expect(tabs[0].requiredPermission).toBe('cms.export');
  });

  it('sorts tabs by order (default 100)', () => {
    extensionRegistry.register('a', {
      dataExchangeTabs: [{ id: 'late', label: 'Late', component: Stub, order: 200 }],
    });
    extensionRegistry.register('b', {
      dataExchangeTabs: [{ id: 'early', label: 'Early', component: Stub, order: 10 }],
    });
    extensionRegistry.register('c', {
      dataExchangeTabs: [{ id: 'default', label: 'Default', component: Stub }],
    });

    const ids = extensionRegistry.getDataExchangeTabs().map((tab) => tab.id);
    expect(ids).toEqual(['early', 'default', 'late']);
  });
});
