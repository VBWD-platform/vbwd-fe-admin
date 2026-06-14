/**
 * S73 — the UserEdit page carries a Groups selector (DualListSelector):
 * it lists all groups, pre-selects the user's current memberships, and saves
 * the replace-set of slugs on submit.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, getActivePinia } from 'pinia';
import UserEdit from '@/views/UserEdit.vue';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    put: (...args: unknown[]) => mockPut(...args),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'user-1' } }),
  useRouter: () => ({ push: vi.fn() }),
}));

function mountComponent() {
  return mount(UserEdit, {
    global: {
      plugins: [getActivePinia()!],
      stubs: {
        'router-link': { template: '<a><slot /></a>', props: ['to'] },
        ApiKeysManager: { template: '<div />' },
      },
      mocks: { $t: (key: string) => key },
    },
  });
}

describe('UserEdit — Groups selector (S73)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extensionRegistry.clear();
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {} } as never,
    });
    useAuthStore().$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/users/user-1') {
        return Promise.resolve({ user: { id: 'user-1', email: 'u@test.com', role: 'USER' } });
      }
      if (url === '/admin/user-groups') {
        return Promise.resolve({
          groups: [
            { id: 'g1', slug: 'vip', name: 'VIP' },
            { id: 'g2', slug: 'trial', name: 'Trial' },
          ],
        });
      }
      if (url === '/admin/users/user-1/groups') {
        return Promise.resolve({ group_slugs: ['vip'] });
      }
      if (url.includes('user-levels')) return Promise.resolve({ levels: [] });
      if (url.includes('levels')) return Promise.resolve({ levels: [] });
      return Promise.resolve({});
    });
    mockPut.mockResolvedValue({});
  });

  it('renders the Groups block listing all groups', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    expect(wrapper.find('[data-testid="user-groups-block"]').exists()).toBe(true);
    // The unselected group ("trial") appears on the available side.
    expect(wrapper.find('[data-testid="dual-list-available-trial"]').exists()).toBe(true);
  });

  it('pre-selects the current memberships', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    expect(wrapper.find('[data-testid="dual-list-assigned-vip"]').exists()).toBe(true);
  });

  it('saves the group_slugs replace-set on submit', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    // Assign 'trial' so the saved set becomes [vip, trial].
    await wrapper.find('[data-testid="dual-list-assign-trial"]').trigger('click');
    await flushPromises();

    await wrapper.find('[data-testid="user-form"]').trigger('submit');
    await flushPromises();

    expect(mockPut).toHaveBeenCalledWith('/admin/users/user-1/groups', {
      group_slugs: ['vip', 'trial'],
    });
  });
});
