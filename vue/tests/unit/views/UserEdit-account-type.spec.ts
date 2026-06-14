/**
 * S74 — the UserEdit Account tab carries an account-type select. Choosing
 * "Business" reveals and requires the Company + Tax fields, and the saved
 * payload carries account_type.
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

describe('UserEdit — account type (S74)', () => {
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
          user: { id: 'user-1', email: 'u@test.com', role: 'USER', details: {} },
        });
      }
      if (url.includes('user-groups')) return Promise.resolve({ groups: [] });
      if (url.includes('groups')) return Promise.resolve({ group_slugs: [] });
      if (url.includes('user-levels')) return Promise.resolve({ levels: [] });
      if (url.includes('levels')) return Promise.resolve({ levels: [] });
      return Promise.resolve({});
    });
    mockPut.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('renders the account-type select defaulting to private', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const select = wrapper.find('[data-testid="account-type-select"]');
    expect(select.exists()).toBe(true);
    expect((select.element as HTMLSelectElement).value).toBe('private');
  });

  it('hides the business fields while private', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const business = wrapper.find('[data-testid="business-fields"]');
    // v-show keeps the node mounted but display:none.
    expect((business.element as HTMLElement).style.display).toBe('none');
  });

  it('reveals company + tax fields when Business is selected', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await wrapper.find('[data-testid="account-type-select"]').setValue('business');
    const business = wrapper.find('[data-testid="business-fields"]');
    expect((business.element as HTMLElement).style.display).not.toBe('none');
    expect(wrapper.find('[data-testid="company-input"]').exists()).toBe(true);
  });

  it('blocks saving a business account without a company', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await wrapper.find('[data-testid="account-type-select"]').setValue('business');
    await wrapper.find('[data-testid="user-form"]').trigger('submit');
    await flushPromises();
    expect(mockPut).not.toHaveBeenCalledWith(
      '/admin/users/user-1',
      expect.objectContaining({ account_type: 'business' }),
    );
  });

  it('saves account_type with the company when valid', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await wrapper.find('[data-testid="account-type-select"]').setValue('business');
    await wrapper.find('[data-testid="company-input"]').setValue('Acme Corp');
    await wrapper.find('[data-testid="user-form"]').trigger('submit');
    await flushPromises();
    expect(mockPut).toHaveBeenCalledWith(
      '/admin/users/user-1',
      expect.objectContaining({ account_type: 'business', company: 'Acme Corp' }),
    );
  });
});
