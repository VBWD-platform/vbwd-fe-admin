import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import TaxAndCountriesSettings from '@/views/TaxAndCountriesSettings.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

vi.mock('@/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn(),
}));

const mockCountries = [
  { id: 'c-de', code: 'DE', name: 'Germany', is_enabled: true, position: 0, created_at: null, updated_at: null },
  { id: 'c-fr', code: 'FR', name: 'France', is_enabled: false, position: 0, created_at: null, updated_at: null },
];

const mockTaxRates = [
  { id: 'tr-1', name: 'DE VAT', code: 'DE_VAT', description: '', rate: '19', country_code: 'DE', region_code: null, tax_class: 'standard', is_active: true, is_inclusive: false, created_at: null, updated_at: null },
];

function mockApiGet(url: string): Promise<unknown> {
  if (url.startsWith('/admin/countries')) {
    return Promise.resolve({ countries: mockCountries });
  }
  if (url.startsWith('/admin/tax/rates')) {
    return Promise.resolve({ rates: mockTaxRates });
  }
  return Promise.resolve({});
}

describe('TaxAndCountriesSettings.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {}, clearToken: () => {} } as any,
    });
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => mockApiGet(url));
  });

  it('renders both Countries and Taxes sub-tabs', async () => {
    const wrapper = mount(TaxAndCountriesSettings);
    await flushPromises();

    expect(wrapper.find('[data-testid="subtab-countries"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="subtab-tax"]').exists()).toBe(true);
  });

  it('renders the page title and sub-tab labels from translations (not raw keys)', async () => {
    const wrapper = mount(TaxAndCountriesSettings);
    await flushPromises();

    const title = wrapper.find('.settings-header h2').text();
    expect(title).toBe('Taxes & Countries');
    expect(title).not.toContain('taxAndCountries');

    const countriesLabel = wrapper.find('[data-testid="subtab-countries"]').text();
    const taxLabel = wrapper.find('[data-testid="subtab-tax"]').text();
    expect(countriesLabel).toBe('Countries');
    expect(taxLabel).toBe('Taxes');
    expect(countriesLabel).not.toContain('taxAndCountries');
    expect(taxLabel).not.toContain('taxAndCountries');
  });

  it('shows the Countries panel by default', async () => {
    const wrapper = mount(TaxAndCountriesSettings);
    await flushPromises();

    expect(wrapper.find('[data-testid="countries-content"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="enabled-countries-list"]').exists()).toBe(true);
  });

  it('enabling a country calls /admin/countries enable', async () => {
    vi.mocked(api.post).mockResolvedValue({});
    const wrapper = mount(TaxAndCountriesSettings);
    await flushPromises();

    await wrapper.find('[data-testid="disabled-country-FR"] button').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/admin/countries/FR/enable');
  });

  it('disabling a country calls /admin/countries disable', async () => {
    vi.mocked(api.post).mockResolvedValue({});
    const wrapper = mount(TaxAndCountriesSettings);
    await flushPromises();

    await wrapper.find('[data-testid="enabled-country-DE"] button').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/admin/countries/DE/disable');
  });

  it('switching to the Taxes sub-tab shows tax content and loads tax rates (no class table)', async () => {
    const wrapper = mount(TaxAndCountriesSettings);
    await flushPromises();

    await wrapper.find('[data-testid="subtab-tax"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="tax-content"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tax-rates-table"]').exists()).toBe(true);
    // Tax Classes are flattened into a `tax_class` string — no class table.
    expect(wrapper.find('[data-testid="tax-classes-table"]').exists()).toBe(false);
    expect(api.get).toHaveBeenCalledWith('/admin/tax/rates');
    const calledUrls = vi.mocked(api.get).mock.calls.map(call => call[0]);
    expect(calledUrls).not.toContain('/admin/tax/classes');
  });

  it('creating a tax rate posts to /admin/tax/rates with a tax_class string', async () => {
    vi.mocked(api.post).mockResolvedValue({ rate: mockTaxRates[0] });
    const wrapper = mount(TaxAndCountriesSettings);
    await flushPromises();

    await wrapper.find('[data-testid="subtab-tax"]').trigger('click');
    await flushPromises();

    await wrapper.find('[data-testid="add-tax-rate-btn"]').trigger('click');
    await wrapper.find('[data-testid="tax-rate-name-input"]').setValue('FR VAT');
    await wrapper.find('[data-testid="tax-rate-code-input"]').setValue('FR_VAT');
    await wrapper.find('[data-testid="tax-rate-class-input"]').setValue('reduced');
    await wrapper.find('[data-testid="save-tax-rate-btn"]').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/admin/tax/rates', expect.objectContaining({
      name: 'FR VAT',
      code: 'FR_VAT',
      tax_class: 'reduced',
    }));
  });
});
