/**
 * UserEdit — the host-owned "Reset user sessions" tab.
 *
 * The tab renders every registered `userSessionBlocks[].userComponent`
 * (permission-filtered), passing `:user-id` and `:active`. Keeps UserEdit
 * agnostic to any specific feature plugin (mirrors the plugin-tab seam).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, getActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import UserEdit from '@/views/UserEdit.vue';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';

const mockGet = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'user-1' } }),
  useRouter: () => ({ push: vi.fn() }),
}));

const UserBlock = defineComponent({
  props: { userId: { type: String, required: true }, active: Boolean },
  template: '<div data-testid="meinchat-user-block">{{ userId }}</div>',
});

function mountComponent() {
  return mount(UserEdit, {
    global: {
      plugins: [getActivePinia()!],
      stubs: {
        'router-link': { template: '<a><slot /></a>', props: ['to'] },
      },
      mocks: { $t: (key: string) => key },
    },
  });
}

function seedAdmin(permissions: string[]) {
  setActivePinia(createPinia());
  configureAuthStore({
    storageKey: 'test_token',
    apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {} } as never,
  });
  useAuthStore().$patch({
    user: { id: '1', email: 'admin@test.com', role: 'ADMIN', permissions },
    token: 'test-token',
  });
}

describe('UserEdit — Reset user sessions tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extensionRegistry.clear();
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/users/user-1') {
        return Promise.resolve({ user: { id: 'user-1', email: 'u@test.com', role: 'USER' } });
      }
      if (url.includes('/admin/access')) return Promise.resolve({ levels: [] });
      return Promise.resolve({});
    });
  });

  it('renders the user block passing the userId when admin has the permission', async () => {
    seedAdmin(['meinchat.guests.manage', 'users.manage']);
    extensionRegistry.register('meinchat-admin', {
      userSessionBlocks: [
        {
          id: 'meinchat-guest-sessions',
          label: 'Guest economy',
          requiredPermission: 'meinchat.guests.manage',
          userComponent: UserBlock,
        },
      ],
    });

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="tab-reset-user-sessions"]').exists()).toBe(true);
    await wrapper.find('[data-testid="tab-reset-user-sessions"]').trigger('click');
    await flushPromises();

    const block = wrapper.find('[data-testid="meinchat-user-block"]');
    expect(block.exists()).toBe(true);
    expect(block.text()).toContain('user-1');
  });

  it('hides the tab when no user block is permitted', async () => {
    seedAdmin(['users.manage']);
    extensionRegistry.register('meinchat-admin', {
      userSessionBlocks: [
        {
          id: 'meinchat-guest-sessions',
          label: 'Guest economy',
          requiredPermission: 'meinchat.guests.manage',
          userComponent: UserBlock,
        },
      ],
    });

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="tab-reset-user-sessions"]').exists()).toBe(false);
  });
});
