import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import TaxesTab from '@/views/tax-countries/TaxesTab.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

// Flattened Tax Classes: the `TaxClass` model is gone. A Tax (rate) now carries
// a plain `tax_class` string. The Tax Classes section (table + class form +
// its ImportExportControls) is removed; the rate form gets a simple
// `tax_class` text input that round-trips into the create/update payload.
vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    getJson: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn(),
}));

// Force the data-exchange manifest to expose both `taxes` and `tax_classes`
// as fully-capable so the test proves the component only renders ONE control.
const exportableCapabilities = {
  can_export: true,
  can_import: true,
  can_export_pii: false,
  supported_formats: ['json'],
};
vi.mock('@/composables/useDataExchangeManifest', () => ({
  useDataExchangeManifest: () => ({
    load: vi.fn(),
    capabilitiesFor: () => exportableCapabilities,
  }),
}));

const mockTaxRates = [
  {
    id: 'tr-1',
    name: 'DE VAT',
    code: 'DE_VAT',
    description: '',
    rate: '19',
    country_code: 'DE',
    region_code: null,
    tax_class: 'standard',
    is_active: true,
    is_inclusive: false,
    created_at: null,
    updated_at: null,
  },
];

function mockApiGet(): void {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/settings') return Promise.resolve({ settings: {} });
    if (url === '/admin/tax/rates') return Promise.resolve({ rates: mockTaxRates });
    return Promise.resolve({});
  });
}

describe('TaxesTab.vue — flattened tax_class field', () => {
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

  it('does not render the Tax Classes section (table, form, controls are gone)', async () => {
    const wrapper = mount(TaxesTab);
    await flushPromises();

    expect(wrapper.find('[data-testid="tax-classes-table"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="tax-class-form"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="add-tax-class-btn"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="classes-bulk-toolbar"]').exists()).toBe(false);
  });

  it('never calls the removed /admin/tax/classes endpoint', async () => {
    mount(TaxesTab);
    await flushPromises();

    const calledUrls = vi.mocked(api.get).mock.calls.map(call => call[0]);
    expect(calledUrls).not.toContain('/admin/tax/classes');
  });

  it('shows exactly one ImportExportControls scoped to taxes', async () => {
    const wrapper = mount(TaxesTab);
    await flushPromises();

    const controls = wrapper.findAllComponents({ name: 'ImportExportControls' });
    expect(controls).toHaveLength(1);
    expect(controls[0].props('entityKey')).toBe('taxes');
  });

  it('renders the tax_class input on the rate form', async () => {
    const wrapper = mount(TaxesTab);
    await flushPromises();

    await wrapper.find('[data-testid="add-tax-rate-btn"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="tax-rate-class-input"]').exists()).toBe(true);
    // The old class <select> is gone.
    expect(wrapper.find('[data-testid="tax-rate-class-select"]').exists()).toBe(false);
  });

  it('sends tax_class (string) in the create payload — not tax_class_id', async () => {
    vi.mocked(api.post).mockResolvedValue({ rate: mockTaxRates[0] });
    const wrapper = mount(TaxesTab);
    await flushPromises();

    await wrapper.find('[data-testid="add-tax-rate-btn"]').trigger('click');
    await flushPromises();

    await wrapper.find('[data-testid="tax-rate-name-input"]').setValue('New VAT');
    await wrapper.find('[data-testid="tax-rate-code-input"]').setValue('NEW_VAT');
    await wrapper.find('[data-testid="tax-rate-class-input"]').setValue('reduced');
    await wrapper.find('[data-testid="save-tax-rate-btn"]').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith(
      '/admin/tax/rates',
      expect.objectContaining({ tax_class: 'reduced' }),
    );
    const payload = vi.mocked(api.post).mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('tax_class_id');
  });

  it('round-trips an existing tax_class into the edit form and update payload', async () => {
    vi.mocked(api.put).mockResolvedValue({ rate: mockTaxRates[0] });
    const wrapper = mount(TaxesTab);
    await flushPromises();

    await wrapper.find('[data-testid="tax-rates-table"]').exists();
    // Edit the first rate.
    const editButtons = wrapper.findAll('.tax-tab .data-table .btn');
    await editButtons[0].trigger('click');
    await flushPromises();

    const classInput = wrapper.find('[data-testid="tax-rate-class-input"]');
    expect((classInput.element as HTMLInputElement).value).toBe('standard');

    await classInput.setValue('zero');
    await wrapper.find('[data-testid="save-tax-rate-btn"]').trigger('click');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith(
      '/admin/tax/rates/tr-1',
      expect.objectContaining({ tax_class: 'zero' }),
    );
  });

  it('displays the tax_class string in the rates table', async () => {
    const wrapper = mount(TaxesTab);
    await flushPromises();

    const table = wrapper.find('[data-testid="tax-rates-table"]');
    expect(table.text()).toContain('standard');
  });
});
