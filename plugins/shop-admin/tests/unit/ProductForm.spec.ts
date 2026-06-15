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
  is_digital: false,
  weight: null,
  tax_class: 'standard',
  categories: [],
  tax_ids: ['tax-1'],
};

function mockApiByUrl(product: Record<string, unknown> | null): void {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/tax/rates') return Promise.resolve({ rates: taxRates });
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
