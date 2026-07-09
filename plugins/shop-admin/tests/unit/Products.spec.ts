import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Products from '../../src/views/Products.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import { useProductAdminStore } from '../../src/stores/productAdmin';

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

vi.mock('@/api/dataExchangeApi', () => ({
  createDataExchangeApi: vi.fn(() => ({})),
}));

vi.mock('@/composables/useDataExchangeManifest', () => ({
  useDataExchangeManifest: () => ({
    load: vi.fn(),
    capabilitiesFor: () => ({
      can_export: false,
      can_import: false,
      can_export_pii: false,
      supported_formats: [],
    }),
  }),
}));

const mockProducts = [
  {
    id: '1',
    name: 'Headphones',
    slug: 'headphones',
    sku: 'ELEC-001',
    price: '79.99',
    currency: 'EUR',
    is_active: true,
    primary_image_url: null,
  },
  {
    id: '2',
    name: 'Mouse',
    slug: 'mouse',
    sku: 'ELEC-002',
    price: '19.99',
    currency: 'EUR',
    is_active: false,
    primary_image_url: null,
  },
];

function grantPermissions(permissions: string[]): void {
  const authStore = useAuthStore();
  authStore.$patch({
    user: { id: '1', email: 'admin@test.com', role: 'ADMIN', permissions },
    token: 'test-token',
  });
}

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/shop/products', name: 'products', component: { template: '<div>Products</div>' } },
      { path: '/admin/shop/products/new', name: 'product-new', component: { template: '<div>New</div>' } },
      { path: '/admin/shop/products/:id/edit', name: 'product-edit', component: { template: '<div>Edit</div>' } },
    ],
  });
}

describe('Products.vue — Make a copy bulk action', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
    });
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ products: mockProducts, page: 1, per_page: 25 });
  });

  it('renders the bulk-copy button only once rows are selected', async () => {
    grantPermissions(['*']);
    const router = buildRouter();
    const wrapper = mount(Products, { global: { plugins: [router] } });
    await flushPromises();

    // Nothing selected yet -> the bulk toolbar (and its copy button) is hidden.
    expect(wrapper.find('[data-testid="bulk-copy"]').exists()).toBe(false);

    await wrapper.find('[data-testid="select-product-1"]').setValue(true);

    expect(wrapper.find('[data-testid="bulk-copy"]').exists()).toBe(true);
  });

  it('hides the bulk-copy button when the user cannot manage products', async () => {
    grantPermissions(['shop.orders.view']);
    const router = buildRouter();
    const wrapper = mount(Products, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('[data-testid="select-product-1"]').setValue(true);

    // Toolbar shows (rows are selected) but the manage-gated copy button does not.
    expect(wrapper.find('[data-testid="bulk-toolbar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="bulk-copy"]').exists()).toBe(false);
  });

  it('copies exactly the selected ids, then refreshes and clears the selection', async () => {
    grantPermissions(['*']);
    const store = useProductAdminStore();
    const router = buildRouter();
    const wrapper = mount(Products, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('[data-testid="select-product-1"]').setValue(true);
    await wrapper.find('[data-testid="select-product-2"]').setValue(true);

    const copySpy = vi
      .spyOn(store, 'bulkCopyProducts')
      .mockResolvedValue({ products: [], count: 2 });
    const refreshSpy = vi.spyOn(store, 'fetchProducts').mockResolvedValue();

    await wrapper.find('[data-testid="bulk-copy"]').trigger('click');
    await flushPromises();

    expect(copySpy).toHaveBeenCalledWith(['1', '2']);
    expect(refreshSpy).toHaveBeenCalled();
    // Selection cleared -> toolbar disappears.
    expect(wrapper.find('[data-testid="bulk-toolbar"]').exists()).toBe(false);
  });
});
