/**
 * S46.5 — Import/Export was relocated OUT of Settings into a standalone
 * page (`/admin/import-export`). Settings must no longer render an
 * Import/Export tab. The behavioural coverage now lives in
 * `ImportExportView.spec.ts` (the standalone view) and
 * `AdminSidebarImportExport.spec.ts` (the SETTINGS nav item).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Settings from '@/views/Settings.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';

vi.mock('@/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn(),
}));

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/admin/settings' },
      { path: '/admin/settings', name: 'settings', component: Settings },
      { path: '/admin/settings/token-bundles/new', name: 'token-bundle-new', component: { template: '<div />' } },
      { path: '/admin/settings/token-bundles/:id', name: 'token-bundle-edit', component: { template: '<div />' } },
    ],
  });
}

function mountSettings() {
  return mount(Settings, {
    global: {
      plugins: [makeRouter()],
    },
  });
}

describe('Settings → no Import/Export tab (S46.5)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    extensionRegistry.clear();
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {}, clearToken: () => {} } as never,
    });
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ settings: {} });
  });

  it('no longer renders the Import/Export tab (relocated to /admin/import-export)', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'a@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 't',
    });

    const wrapper = mountSettings();
    await flushPromises();

    expect(wrapper.find('[data-testid="tab-import-export"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="import-export-content"]').exists()).toBe(false);
  });
});
