import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import TaxesTab from '@/views/tax-countries/TaxesTab.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

// S72.4 — the global netto/brutto switch (`prices_display_mode`) on the Taxes
// tab round-trips via the existing GET|PUT /admin/settings endpoint.
vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn(),
}));

function mockApiByUrl(displayMode: string): void {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/settings') {
      return Promise.resolve({ settings: { prices_display_mode: displayMode } });
    }
    if (url === '/admin/tax/rates') return Promise.resolve({ rates: [] });
    return Promise.resolve({});
  });
}

describe('TaxesTab.vue — prices_display_mode global switch (S72.4)', () => {
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
  });

  it('loads the current prices_display_mode from /admin/settings', async () => {
    mockApiByUrl('netto');

    const wrapper = mount(TaxesTab);
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/settings');
    const select = wrapper.find('[data-testid="prices-display-mode-select"]');
    expect(select.exists()).toBe(true);
    expect((select.element as HTMLSelectElement).value).toBe('netto');
  });

  it('defaults to brutto when the setting is absent', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/admin/settings') return Promise.resolve({ settings: {} });
      if (url === '/admin/tax/rates') return Promise.resolve({ rates: [] });
      return Promise.resolve({});
    });

    const wrapper = mount(TaxesTab);
    await flushPromises();

    const select = wrapper.find('[data-testid="prices-display-mode-select"]');
    expect((select.element as HTMLSelectElement).value).toBe('brutto');
  });

  it('PUTs the changed value to /admin/settings', async () => {
    mockApiByUrl('brutto');
    vi.mocked(api.put).mockResolvedValue({});

    const wrapper = mount(TaxesTab);
    await flushPromises();

    await wrapper.find('[data-testid="prices-display-mode-select"]').setValue('netto');
    await wrapper.find('[data-testid="save-prices-display-mode-btn"]').trigger('click');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith(
      '/admin/settings',
      expect.objectContaining({ prices_display_mode: 'netto' }),
    );
  });
});
