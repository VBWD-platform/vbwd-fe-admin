import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import TaxAndCountriesSettings from '@/views/TaxAndCountriesSettings.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

// S84 — the Currency sub-tab is added to the Taxes & Countries shell and is
// lazy-mounted (mirroring the Taxes tab).
vi.mock('@/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn(),
}));

describe('TaxAndCountriesSettings.vue — Currency sub-tab (S84)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
    });
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/admin/currencies') return Promise.resolve({ currencies: [] });
      if (url === '/admin/settings') return Promise.resolve({ settings: {} });
      if (url === '/admin/countries') return Promise.resolve({ countries: [] });
      return Promise.resolve({});
    });
  });

  it('renders a Currency sub-tab button', () => {
    const wrapper = mount(TaxAndCountriesSettings);
    expect(wrapper.find('[data-testid="subtab-currencies"]').exists()).toBe(true);
  });

  it('does not mount CurrenciesTab until the Currency tab is selected', async () => {
    const wrapper = mount(TaxAndCountriesSettings);
    await flushPromises();
    expect(wrapper.find('[data-testid="currencies-content"]').exists()).toBe(false);

    await wrapper.find('[data-testid="subtab-currencies"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="currencies-content"]').exists()).toBe(true);
  });
});
