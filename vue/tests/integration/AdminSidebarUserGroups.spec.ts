/**
 * S73 — "User Groups" as a SETTINGS sidebar item, directly below Access Levels.
 *
 * The nav item must live in the SETTINGS group, route to
 * /admin/settings/user_groups, and be hidden (not disabled) when the user lacks
 * `settings.manage`.
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

describe('AdminSidebar — User Groups item (S73)', () => {
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

  it('renders the User Groups item in the SETTINGS group routed to the page', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      token: 't',
      user: { id: '1', email: 'a@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
    });

    const wrapper = mountSidebar();
    await flushPromises();

    const settingsSection = wrapper.find('[data-testid="nav-section-settings"]');
    expect(settingsSection.exists()).toBe(true);

    const item = wrapper.find('[data-testid="nav-item-user-groups"]');
    expect(item.exists()).toBe(true);
    expect(item.attributes('href')).toBe('/admin/settings/user_groups');
  });

  it('renders User Groups directly below Access Levels', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      token: 't',
      user: { id: '1', email: 'a@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
    });

    const wrapper = mountSidebar();
    await flushPromises();

    const hrefs = wrapper
      .findAll('[data-testid^="nav-item-"]')
      .map((node) => node.attributes('href'));
    const accessIndex = hrefs.indexOf('/admin/settings/access');
    const groupsIndex = hrefs.indexOf('/admin/settings/user_groups');
    expect(accessIndex).toBeGreaterThanOrEqual(0);
    expect(groupsIndex).toBe(accessIndex + 1);
  });

  it('hides the User Groups item when the user lacks settings.manage', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      token: 't',
      user: { id: '1', email: 'a@test.com', role: 'ADMIN', permissions: ['settings.view'] },
    });

    const wrapper = mountSidebar();
    await flushPromises();

    expect(wrapper.find('[data-testid="nav-item-user-groups"]').exists()).toBe(false);
  });
});
