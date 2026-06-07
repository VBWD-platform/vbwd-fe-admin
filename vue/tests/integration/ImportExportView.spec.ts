/**
 * S46.5 — Standalone Import/Export page (R7 + R12).
 *
 * The Import/Export UI was relocated from a Settings tab to its own
 * standalone view (`/admin/import-export`). This view renders the shared
 * `ImportExportPage` (stubbed here) with the dataExchangeApi, isSuperadmin,
 * and the registry's permission-filtered `dataExchangeTabs`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { defineComponent } from 'vue';
import ImportExport from '@/views/ImportExport.vue';
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

const ImportExportPageStub = defineComponent({
  name: 'ImportExportPage',
  props: ['api', 'isSuperadmin', 'tabs'],
  template: '<div data-testid="iep-stub" />',
});

function mountView() {
  return mount(ImportExport, {
    global: {
      stubs: { ImportExportPage: ImportExportPageStub },
    },
  });
}

describe('ImportExport.vue (standalone page, S46.5)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    extensionRegistry.clear();
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {}, clearToken: () => {} } as never,
    });
    vi.clearAllMocks();
  });

  it('renders ImportExportPage with api, isSuperadmin=false, and tabs for an admin', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'a@test.com', role: 'ADMIN', permissions: ['settings.view'] },
      token: 't',
    });

    const wrapper = mountView();
    await flushPromises();

    const page = wrapper.findComponent(ImportExportPageStub);
    expect(page.exists()).toBe(true);
    expect(page.props('isSuperadmin')).toBe(false);
    expect(page.props('api')).toBeTruthy();
    expect(Array.isArray(page.props('tabs'))).toBe(true);
  });

  it('passes isSuperadmin=true for a SUPER_ADMIN', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'a@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 't',
    });

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findComponent(ImportExportPageStub).props('isSuperadmin')).toBe(true);
  });

  it('passes registry dataExchangeTabs filtered by requiredPermission', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'a@test.com', role: 'ADMIN', permissions: ['settings.view', 'cms.export'] },
      token: 't',
    });
    const Stub = defineComponent({ template: '<div />' });
    extensionRegistry.register('cms-admin', {
      dataExchangeTabs: [
        { id: 'cms', label: 'CMS', component: Stub, requiredPermission: 'cms.export' },
        { id: 'secret', label: 'Secret', component: Stub, requiredPermission: 'nope.perm' },
      ],
    });

    const wrapper = mountView();
    await flushPromises();

    const tabs = wrapper.findComponent(ImportExportPageStub).props('tabs') as Array<{ id: string }>;
    expect(tabs.map((tab) => tab.id)).toEqual(['cms']);
  });
});
