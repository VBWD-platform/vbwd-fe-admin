/**
 * S46.5 — Import/Export as a standalone SETTINGS sidebar item (R12).
 *
 * The Import/Export nav item must be the LAST entry in the SETTINGS group,
 * gated by `settings.view` (hidden, not disabled, when the permission is
 * missing).
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

describe('AdminSidebar — Import/Export item (S46.5)', () => {
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

  it('renders the Import/Export item as the LAST entry in the SETTINGS group', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      token: 't',
      user: { id: '1', email: 'a@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
    });

    const wrapper = mountSidebar();
    await flushPromises();

    const settingsSection = wrapper.find('[data-testid="nav-section-settings"]');
    expect(settingsSection.exists()).toBe(true);

    const item = wrapper.find('[data-testid="nav-item-import-export"]');
    expect(item.exists()).toBe(true);
    expect(item.attributes('href')).toBe('/admin/import-export');

    // It must be the last item in the settings group.
    const group = settingsSection.element.closest('.nav-section') as HTMLElement;
    const links = Array.from(group.querySelectorAll('.nav-submenu .nav-item'));
    const lastLink = links[links.length - 1] as HTMLAnchorElement;
    expect(lastLink.getAttribute('href')).toBe('/admin/import-export');
  });

  it('R12: hides the Import/Export item when the user lacks settings.view', async () => {
    const authStore = useAuthStore();
    authStore.$patch({
      token: 't',
      user: { id: '1', email: 'a@test.com', role: 'ADMIN', permissions: ['users.view'] },
    });

    const wrapper = mountSidebar();
    await flushPromises();

    expect(wrapper.find('[data-testid="nav-item-import-export"]').exists()).toBe(false);
  });
});
