import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import ProductForm from '../../src/views/ProductForm.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import { __resetTaxOptionsCache } from '@/composables/useTaxOptions';

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

const taxRates = [
  { id: 'tax-1', code: 'VAT19', name: 'Standard VAT', rate: '19.00', is_active: true },
  { id: 'tax-2', code: 'OLD', name: 'Retired', rate: '7.00', is_active: false },
];

const mockProduct = {
  id: 'prod-1',
  name: 'Widget',
  slug: 'widget',
  sku: 'W-1',
  price: '9.99',
  currency: 'EUR',
  description: 'A widget',
  is_active: true,
  weight: null,
  tax_class: 'standard',
  categories: [],
  tax_ids: ['tax-1'],
};

const simpleProductType = {
  id: 'pt-0',
  slug: 'simple_product',
  name: 'Simple product',
  description: '',
  product_type_fields: [],
  source: 'plugin',
  is_active: true,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
};

const pharmaProductType = {
  id: 'pt-1',
  slug: 'pharma',
  name: 'Pharma',
  description: 'Pharmaceutical products',
  product_type_fields: [
    { slug: 'atc_code', type: 'string', label: 'ATC code', required: false, options: [], help: null, sort_order: 1 },
    { slug: 'product_class', type: 'select', label: 'Product class', required: true, options: ['RX', 'OTC'], help: null, sort_order: 2 },
  ],
  source: 'plugin',
  is_active: true,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
};

// `productTypes` lets a test override the loaded type list (e.g. omit
// simple_product to exercise the graceful fallback). Defaults to the real
// coexistence set: the named default simple_product plus pharma.
function mockApiByUrl(
  product: Record<string, unknown> | null,
  productTypes: Array<Record<string, unknown>> = [simpleProductType, pharmaProductType],
): void {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/tax/rates') return Promise.resolve({ rates: taxRates });
    if (url === '/shop/product-types') return Promise.resolve({ product_types: productTypes });
    if (url.startsWith('/admin/shop/products/')) return Promise.resolve({ product });
    if (url === '/admin/shop/categories') return Promise.resolve({ categories: [] });
    if (url === '/admin/shop/warehouses') return Promise.resolve({ warehouses: [] });
    if (url === '/admin/shop/stock') return Promise.resolve({ stock: [] });
    return Promise.resolve({});
  });
}

describe('ProductForm.vue — Taxes block (S72.3)', () => {
  let router: ReturnType<typeof createRouter>;

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
    __resetTaxOptionsCache();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/shop/products', name: 'products', component: { template: '<div>Products</div>' } },
        { path: '/admin/shop/products/new', name: 'product-new', component: ProductForm },
        { path: '/admin/shop/products/:id/edit', name: 'product-edit', component: ProductForm },
      ],
    });
  });

  it('lists active taxes from /admin/tax/rates in the General tab', async () => {
    mockApiByUrl(null);
    await router.push('/admin/shop/products/new');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.find('[data-testid="product-taxes-section"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="dual-list-available-tax-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="dual-list-available-tax-2"]').exists()).toBe(false);
  });

  it('keeps the legacy tax_class select for back-compat', async () => {
    mockApiByUrl(null);
    await router.push('/admin/shop/products/new');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.find('[data-testid="product-tax-class-input"]').exists()).toBe(true);
  });

  it('pre-selects the product\'s assigned tax_ids on edit', async () => {
    mockApiByUrl(mockProduct);
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.find('[data-testid="dual-list-assigned-tax-1"]').exists()).toBe(true);
  });

  it('sends tax_ids in the update payload', async () => {
    mockApiByUrl(mockProduct);
    vi.mocked(api.put).mockResolvedValue({ product: mockProduct });
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('[data-testid="tab-general-content"]').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith(
      '/admin/shop/products/prod-1',
      expect.objectContaining({ tax_ids: ['tax-1'] }),
    );
  });
});

describe('ProductForm.vue — Price display override (S72.4)', () => {
  let router: ReturnType<typeof createRouter>;

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
    __resetTaxOptionsCache();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/shop/products', name: 'products', component: { template: '<div>Products</div>' } },
        { path: '/admin/shop/products/new', name: 'product-new', component: ProductForm },
        { path: '/admin/shop/products/:id/edit', name: 'product-edit', component: ProductForm },
      ],
    });
  });

  it('defaults to Inherit (empty) when price_display_mode is null', async () => {
    mockApiByUrl(null);
    await router.push('/admin/shop/products/new');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    const select = wrapper.find('[data-testid="product-price-display-mode"]');
    expect(select.exists()).toBe(true);
    // The Inherit option (empty value) is the default selection.
    expect((select.element as HTMLSelectElement).selectedIndex).toBe(0);
  });

  it('pre-selects the product\'s price_display_mode on edit', async () => {
    mockApiByUrl({ ...mockProduct, price_display_mode: 'netto' });
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    const select = wrapper.find('[data-testid="product-price-display-mode"]');
    expect((select.element as HTMLSelectElement).value).toBe('netto');
  });

  it('sends price_display_mode=null when Inherit is selected', async () => {
    mockApiByUrl(mockProduct);
    vi.mocked(api.put).mockResolvedValue({ product: mockProduct });
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('[data-testid="tab-general-content"]').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith(
      '/admin/shop/products/prod-1',
      expect.objectContaining({ price_display_mode: null }),
    );
  });

  it('sends the selected override in the update payload', async () => {
    mockApiByUrl(mockProduct);
    vi.mocked(api.put).mockResolvedValue({ product: mockProduct });
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('[data-testid="product-price-display-mode"]').setValue('brutto');
    await wrapper.find('[data-testid="tab-general-content"]').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith(
      '/admin/shop/products/prod-1',
      expect.objectContaining({ price_display_mode: 'brutto' }),
    );
  });
});

describe('ProductForm.vue — Product type + dynamic fields (S116.2)', () => {
  let router: ReturnType<typeof createRouter>;

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
    __resetTaxOptionsCache();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/shop/products', name: 'products', component: { template: '<div>Products</div>' } },
        { path: '/admin/shop/products/new', name: 'product-new', component: ProductForm },
        { path: '/admin/shop/products/:id/edit', name: 'product-edit', component: ProductForm },
      ],
    });
  });

  it('does NOT render the global CustomFieldsEditor on the base product form', async () => {
    mockApiByUrl(mockProduct);
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.findComponent({ name: 'CustomFieldsEditor' }).exists()).toBe(false);
  });

  it('offers a type selector listing the loaded types with no synthetic "none" option', async () => {
    mockApiByUrl(null);
    await router.push('/admin/shop/products/new');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    const select = wrapper.find('[data-testid="product-type-select"]');
    expect(select.exists()).toBe(true);
    // Two real types (simple_product + pharma), no synthetic "— none —" option.
    const optionLabels = select.findAll('option').map(option => option.text().trim());
    expect(optionLabels).toEqual(['Simple product', 'Pharma']);
  });

  it('renders no dynamic fields for the default simple_product type (empty cluster)', async () => {
    mockApiByUrl(null);
    await router.push('/admin/shop/products/new');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.find('[data-testid="product-type-fields"]').exists()).toBe(false);
  });

  it('renders the selected type\'s dynamic fields', async () => {
    mockApiByUrl(null);
    await router.push('/admin/shop/products/new');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('[data-testid="product-type-select"]').setValue('pharma');
    await flushPromises();

    expect(wrapper.find('[data-testid="product-type-fields"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="type-field-atc_code"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="type-field-product_class"]').exists()).toBe(true);
  });

  it('hydrates the selector and values from the product on edit', async () => {
    mockApiByUrl({
      ...mockProduct,
      product_type_slug: 'pharma',
      type_field_values: { atc_code: 'N02BE01', product_class: 'OTC' },
    });
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    const select = wrapper.find('[data-testid="product-type-select"]');
    expect((select.element as HTMLSelectElement).value).toBe('pharma');
    expect(
      (wrapper.find('[data-testid="type-field-atc_code"]').element as HTMLInputElement).value,
    ).toBe('N02BE01');
  });

  it('sends product_type_slug and type_field_values in the update payload', async () => {
    mockApiByUrl({
      ...mockProduct,
      product_type_slug: 'pharma',
      type_field_values: { atc_code: 'N02BE01' },
    });
    vi.mocked(api.put).mockResolvedValue({ product: mockProduct });
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('[data-testid="tab-general-content"]').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith(
      '/admin/shop/products/prod-1',
      expect.objectContaining({
        product_type_slug: 'pharma',
        type_field_values: { atc_code: 'N02BE01' },
      }),
    );
  });

  it('sends the simple_product slug and empty values when the default type is selected', async () => {
    mockApiByUrl({
      ...mockProduct,
      product_type_slug: 'pharma',
      type_field_values: { atc_code: 'N02BE01' },
    });
    vi.mocked(api.put).mockResolvedValue({ product: mockProduct });
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('[data-testid="product-type-select"]').setValue('simple_product');
    await wrapper.find('[data-testid="tab-general-content"]').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith(
      '/admin/shop/products/prod-1',
      expect.objectContaining({ product_type_slug: 'simple_product', type_field_values: {} }),
    );
  });
});

describe('ProductForm.vue — simple_product default (S116.4)', () => {
  let router: ReturnType<typeof createRouter>;

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
    __resetTaxOptionsCache();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/shop/products', name: 'products', component: { template: '<div>Products</div>' } },
        { path: '/admin/shop/products/new', name: 'product-new', component: ProductForm },
        { path: '/admin/shop/products/:id/edit', name: 'product-edit', component: ProductForm },
      ],
    });
  });

  it('defaults a NEW product to the simple_product type', async () => {
    mockApiByUrl(null);
    await router.push('/admin/shop/products/new');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    const select = wrapper.find('[data-testid="product-type-select"]');
    expect((select.element as HTMLSelectElement).value).toBe('simple_product');
  });

  it('displays a legacy product with a null slug as simple_product', async () => {
    mockApiByUrl({ ...mockProduct, product_type_slug: null, type_field_values: null });
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    const select = wrapper.find('[data-testid="product-type-select"]');
    expect((select.element as HTMLSelectElement).value).toBe('simple_product');
  });

  it('still hydrates a real non-default type with its fields on edit', async () => {
    mockApiByUrl({
      ...mockProduct,
      product_type_slug: 'pharma',
      type_field_values: { atc_code: 'N02BE01' },
    });
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    const select = wrapper.find('[data-testid="product-type-select"]');
    expect((select.element as HTMLSelectElement).value).toBe('pharma');
    expect(wrapper.find('[data-testid="product-type-fields"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="type-field-atc_code"]').exists()).toBe(true);
  });

  it('falls back gracefully to a null-slug base product when simple_product is absent', async () => {
    // Type endpoint has not registered simple_product yet — only pharma present.
    mockApiByUrl({ ...mockProduct, product_type_slug: null, type_field_values: null }, [pharmaProductType]);
    vi.mocked(api.put).mockResolvedValue({ product: mockProduct });
    await router.push('/admin/shop/products/prod-1/edit');

    const wrapper = mount(ProductForm, { global: { plugins: [router] } });
    await flushPromises();

    // No crash: the base "none" fallback option is offered and no fields render.
    const noneOption = wrapper.find('[data-testid="product-type-select"] option[value=""]');
    expect(noneOption.exists()).toBe(true);
    expect(wrapper.find('[data-testid="product-type-fields"]').exists()).toBe(false);

    // The saved product keeps its null slug (no synthetic default is forced on it).
    await wrapper.find('[data-testid="tab-general-content"]').trigger('submit');
    await flushPromises();
    expect(api.put).toHaveBeenCalledWith(
      '/admin/shop/products/prod-1',
      expect.objectContaining({ product_type_slug: null, type_field_values: {} }),
    );
  });
});
