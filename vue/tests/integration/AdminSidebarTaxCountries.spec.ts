/**
 * S72.1 — "Taxes & Countries" as a SETTINGS sidebar item.
 *
 * The nav item must live in the SETTINGS group, route to
 * /admin/settings/tax-and-countries, and be hidden (not disabled) when the
 * user lacks `settings.manage`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import AdminSidebar from '@/layouts/AdminSidebar.vue';
import { useAuthStore, configureAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';
import { api } from '@/api';

vi.mock('@/api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn(),
}));

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  });
}

let pinia: ReturnType<typeof createPinia>;

function mountSidebar() {
  return mount(AdminSidebar, {
    global: { plugins: [pinia, makeRouter()] },
  });
}

describe('AdminSidebar — Taxes & Countries item (S72.1)', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    extensionRegistry.clear();
    vi.clearAllMocks();
    configureAuthStore({
      apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
      storageKey: 'admin_token',
    });
  });

  it('renders the Taxes & Countries item in the SETTINGS group routed to the page', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      token: 't',
      user: { id: '1', email: 'a@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
    });

    const wrapper = mountSidebar();
    await flushPromises();

    const settingsSection = wrapper.find('[data-testid="nav-section-settings"]');
    expect(settingsSection.exists()).toBe(true);

    const item = wrapper.find('[data-testid="nav-item-taxes-and-countries"]');
    expect(item.exists()).toBe(true);
    expect(item.attributes('href')).toBe('/admin/settings/tax-and-countries');
  });

  it('hides the Taxes & Countries item when the user lacks settings.manage', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      token: 't',
      user: { id: '1', email: 'a@test.com', role: 'ADMIN', permissions: ['settings.view'] },
    });

    const wrapper = mountSidebar();
    await flushPromises();

    expect(wrapper.find('[data-testid="nav-item-taxes-and-countries"]').exists()).toBe(false);
  });
});
