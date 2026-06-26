/**
 * S106.3 — "Logs" as a SETTINGS sidebar item gated by the `logs.read` permission.
 *
 * The nav item must live in the SETTINGS group, route to /admin/logs, and be
 * hidden (not disabled) when the user lacks `logs.read`.
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

describe('AdminSidebar — Logs item (S106.3)', () => {
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

  it('renders the Logs item in the SETTINGS group routed to /admin/logs', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      token: 't',
      user: { id: '1', email: 'a@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
    });

    const wrapper = mountSidebar();
    await flushPromises();

    const settingsSection = wrapper.find('[data-testid="nav-section-settings"]');
    expect(settingsSection.exists()).toBe(true);

    const item = wrapper.find('[data-testid="nav-item-logs"]');
    expect(item.exists()).toBe(true);
    expect(item.attributes('href')).toBe('/admin/logs');
  });

  it('hides the Logs item when the user lacks logs.read', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      token: 't',
      user: { id: '1', email: 'a@test.com', role: 'ADMIN', permissions: ['settings.view'] },
    });

    const wrapper = mountSidebar();
    await flushPromises();

    expect(wrapper.find('[data-testid="nav-item-logs"]').exists()).toBe(false);
  });
});
