/**
 * The UserEdit address section carries a State / Region field: it is populated
 * from the fetched user details on load, bound to the model, and included in
 * the PUT /admin/users/<id> payload on save.
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

describe('UserEdit — State / Region field', () => {
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
        return Promise.resolve({
          user: {
            id: 'user-1',
            email: 'u@test.com',
            role: 'USER',
            details: { city: 'Munich', state: 'Bavaria', postal_code: '80331' },
          },
        });
      }
      if (url.includes('user-groups')) return Promise.resolve({ groups: [] });
      if (url.includes('groups')) return Promise.resolve({ group_slugs: [] });
      if (url.includes('/admin/access/roles')) return Promise.resolve({ levels: [] });
      if (url.includes('levels')) return Promise.resolve({ levels: [] });
      return Promise.resolve({});
    });
    mockPut.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('renders the state input populated from fetched details', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const input = wrapper.find('[data-testid="state-input"]');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('Bavaria');
  });

  it('includes state in the user-update payload', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await wrapper.find('[data-testid="state-input"]').setValue('Saxony');
    await wrapper.find('[data-testid="user-form"]').trigger('submit');
    await flushPromises();
    expect(mockPut).toHaveBeenCalledWith(
      '/admin/users/user-1',
      expect.objectContaining({ state: 'Saxony' }),
    );
  });
});
