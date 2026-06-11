/**
 * S52.6 — the native "API" tab on UserEdit ships by default (no registry),
 * is gated by api_keys.manage, mounts the shared ApiKeysManager, and wires its
 * events to the admin store against the target user's keys.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, getActivePinia } from 'pinia';
import UserEdit from '@/views/UserEdit.vue';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
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

function mountComponent() {
  return mount(UserEdit, {
    global: {
      plugins: [getActivePinia()!],
      stubs: {
        'router-link': { template: '<a><slot /></a>', props: ['to'] },
        ApiKeysManager: {
          name: 'ApiKeysManager',
          template: '<div data-testid="api-keys-manager-stub" />',
        },
      },
      mocks: { $t: (key: string) => key },
    },
  });
}

describe('UserEdit — native API tab (S52.6)', () => {
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
      if (url === '/admin/api-keys/scopes') {
        return Promise.resolve({ scopes: { core: [], cms: [{ key: 'cms:posts:create', label: 'C' }] } });
      }
      if (url === '/admin/users/user-1/api-keys') {
        return Promise.resolve({ api_keys: [] });
      }
      if (url.includes('user-levels')) return Promise.resolve({ levels: [] });
      if (url.includes('levels')) return Promise.resolve({ levels: [] });
      return Promise.resolve({});
    });
  });

  it('renders the API tab button by default for an admin with api_keys.manage', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    expect(wrapper.find('[data-testid="tab-api"]').exists()).toBe(true);
  });

  it('mounts ApiKeysManager and loads scopes + the target user keys on switch', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await wrapper.find('[data-testid="tab-api"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="api-keys-manager-stub"]').exists()).toBe(true);
    expect(mockGet).toHaveBeenCalledWith('/admin/api-keys/scopes');
    expect(mockGet).toHaveBeenCalledWith('/admin/users/user-1/api-keys');
  });
});
