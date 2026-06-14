import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import TaxesTab from '@/views/tax-countries/TaxesTab.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

// Bulk select + bulk delete for the Tax Rates table.
// Mirrors the house pattern in plugins/shop-admin/src/views/Products.vue:
// a per-row checkbox + select-all, a bulk-toolbar with bulk-selected-count,
// and a Delete-selected action looping the existing single-delete endpoints.
// Tax Classes are gone (flattened into a `tax_class` string on each rate).
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

const mockTaxRates = [
  { id: 'tr-1', name: 'DE VAT', code: 'DE_VAT', description: '', rate: '19', country_code: 'DE', region_code: null, tax_class: 'standard', is_active: true, is_inclusive: false, created_at: null, updated_at: null },
  { id: 'tr-2', name: 'FR VAT', code: 'FR_VAT', description: '', rate: '20', country_code: 'FR', region_code: null, tax_class: 'standard', is_active: true, is_inclusive: false, created_at: null, updated_at: null },
];

function mockApiGet(): void {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/settings') return Promise.resolve({ settings: {} });
    if (url === '/admin/tax/rates') return Promise.resolve({ rates: mockTaxRates });
    return Promise.resolve({});
  });
}

describe('TaxesTab.vue — bulk delete (rates + classes)', () => {
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
    mockApiGet();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('selecting a tax rate shows the bulk toolbar with the count', async () => {
    const wrapper = mount(TaxesTab);
    await flushPromises();

    expect(wrapper.find('[data-testid="rates-bulk-toolbar"]').exists()).toBe(false);

    await wrapper.find('[data-testid="select-rate-tr-1"]').setValue(true);
    await flushPromises();

    expect(wrapper.find('[data-testid="rates-bulk-toolbar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="rates-bulk-selected-count"]').text()).toContain('1');
  });

  it('select-all selects every tax rate', async () => {
    const wrapper = mount(TaxesTab);
    await flushPromises();

    await wrapper.find('[data-testid="select-all-rates"]').setValue(true);
    await flushPromises();

    expect(wrapper.find('[data-testid="rates-bulk-selected-count"]').text()).toContain('2');
  });

  it('bulk-delete calls the rate delete endpoint per selected id and reloads', async () => {
    vi.mocked(api.delete).mockResolvedValue({});
    const wrapper = mount(TaxesTab);
    await flushPromises();

    await wrapper.find('[data-testid="select-rate-tr-1"]').setValue(true);
    await wrapper.find('[data-testid="select-rate-tr-2"]').setValue(true);
    await flushPromises();

    await wrapper.find('[data-testid="rates-bulk-delete-btn"]').trigger('click');
    await flushPromises();

    expect(api.delete).toHaveBeenCalledWith('/admin/tax/rates/tr-1');
    expect(api.delete).toHaveBeenCalledWith('/admin/tax/rates/tr-2');
    // list reloaded + selection cleared
    expect(wrapper.find('[data-testid="rates-bulk-toolbar"]').exists()).toBe(false);
  });

  it('a 409 (in-use) on one rate still deletes the others and surfaces the in-use message', async () => {
    vi.mocked(api.delete).mockImplementation((url: string) => {
      if (url === '/admin/tax/rates/tr-1') {
        const error = new Error('Tax rate is in use') as Error & { status?: number };
        error.status = 409;
        return Promise.reject(error);
      }
      return Promise.resolve({});
    });

    const wrapper = mount(TaxesTab);
    await flushPromises();

    await wrapper.find('[data-testid="select-rate-tr-1"]').setValue(true);
    await wrapper.find('[data-testid="select-rate-tr-2"]').setValue(true);
    await flushPromises();

    await wrapper.find('[data-testid="rates-bulk-delete-btn"]').trigger('click');
    await flushPromises();

    expect(api.delete).toHaveBeenCalledWith('/admin/tax/rates/tr-1');
    expect(api.delete).toHaveBeenCalledWith('/admin/tax/rates/tr-2');

    const message = wrapper.find('[data-testid="tax-error-message"]').text();
    expect(message.toLowerCase()).toContain('use');
    expect(message).toContain('DE VAT');
  });
});
