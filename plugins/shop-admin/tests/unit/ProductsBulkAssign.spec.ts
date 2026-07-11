import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Products from '../../src/views/Products.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import { useProductAdminStore } from '../../src/stores/productAdmin';
import { fetchApplicableTags } from '@/api/tagsCustomFieldsApi';

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

vi.mock('@/api/tagsCustomFieldsApi', () => ({
  fetchApplicableTags: vi.fn(),
}));

const mockProducts = [
  { id: '1', name: 'Headphones', slug: 'headphones', sku: 'ELEC-001', price: '79.99', currency: 'EUR', is_active: true, primary_image_url: null },
  { id: '2', name: 'Mouse', slug: 'mouse', sku: 'ELEC-002', price: '19.99', currency: 'EUR', is_active: false, primary_image_url: null },
];

const mockCategories = [
  { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', parent_id: null, product_count: 2 },
  { id: 'cat-audio', name: 'Audio', slug: 'audio', parent_id: null, product_count: 1 },
];

const mockTags = [
  { slug: 'sale', name: 'Sale', parent_entity_type: null },
  { slug: 'new', name: 'New', parent_entity_type: 'shop_product' },
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

function mockGetByUrl() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/shop/categories') {
      return Promise.resolve({ categories: mockCategories });
    }
    return Promise.resolve({ products: mockProducts, page: 1, per_page: 25 });
  });
}

describe('Products.vue — bulk category + tag assignment', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
    });
    vi.clearAllMocks();
    mockGetByUrl();
    vi.mocked(fetchApplicableTags).mockResolvedValue(mockTags);
  });

  it('shows the assign-category and assign-tags buttons only once rows are selected', async () => {
    grantPermissions(['*']);
    const wrapper = mount(Products, { global: { plugins: [buildRouter()] } });
    await flushPromises();

    expect(wrapper.find('[data-testid="bulk-assign-category-btn"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="bulk-assign-tags-btn"]').exists()).toBe(false);

    await wrapper.find('[data-testid="select-product-1"]').setValue(true);

    expect(wrapper.find('[data-testid="bulk-assign-category-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="bulk-assign-tags-btn"]').exists()).toBe(true);
  });

  it('hides the assign buttons when the user cannot manage products', async () => {
    grantPermissions(['shop.orders.view']);
    const wrapper = mount(Products, { global: { plugins: [buildRouter()] } });
    await flushPromises();

    await wrapper.find('[data-testid="select-product-1"]').setValue(true);

    expect(wrapper.find('[data-testid="bulk-toolbar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="bulk-assign-category-btn"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="bulk-assign-tags-btn"]').exists()).toBe(false);
  });

  it('confirms a category assignment with the selected id, category and mode, then refreshes + clears', async () => {
    grantPermissions(['*']);
    const store = useProductAdminStore();
    const wrapper = mount(Products, { global: { plugins: [buildRouter()] } });
    await flushPromises();

    await wrapper.find('[data-testid="select-product-1"]').setValue(true);
    await wrapper.find('[data-testid="select-product-2"]').setValue(true);

    const assignSpy = vi.spyOn(store, 'bulkAssignCategory').mockResolvedValue({ updated: 2, skipped: 0 });
    const refreshSpy = vi.spyOn(store, 'fetchProducts').mockResolvedValue();

    await wrapper.find('[data-testid="bulk-assign-category-btn"]').trigger('click');
    await wrapper.find('[data-testid="bulk-category-select"]').setValue('cat-audio');
    await wrapper.find('[data-testid="bulk-category-mode"]').setValue('replace');
    await wrapper.find('[data-testid="bulk-category-confirm"]').trigger('click');
    await flushPromises();

    expect(assignSpy).toHaveBeenCalledWith(['1', '2'], 'cat-audio', 'replace');
    expect(refreshSpy).toHaveBeenCalled();
    expect(wrapper.find('[data-testid="bulk-toolbar"]').exists()).toBe(false);
  });

  it('surfaces the {updated, skipped} result after a category assignment', async () => {
    grantPermissions(['*']);
    const store = useProductAdminStore();
    const wrapper = mount(Products, { global: { plugins: [buildRouter()] } });
    await flushPromises();

    await wrapper.find('[data-testid="select-product-1"]').setValue(true);
    vi.spyOn(store, 'bulkAssignCategory').mockResolvedValue({ updated: 3, skipped: 1 });
    vi.spyOn(store, 'fetchProducts').mockResolvedValue();

    await wrapper.find('[data-testid="bulk-assign-category-btn"]').trigger('click');
    await wrapper.find('[data-testid="bulk-category-select"]').setValue('cat-electronics');
    await wrapper.find('[data-testid="bulk-category-confirm"]').trigger('click');
    await flushPromises();

    const message = wrapper.find('[data-testid="bulk-result-message"]');
    expect(message.exists()).toBe(true);
    expect(message.text()).toContain('3');
    expect(message.text()).toContain('1');
  });

  it('unassigns the chosen category via the unassign affordance', async () => {
    grantPermissions(['*']);
    const store = useProductAdminStore();
    const wrapper = mount(Products, { global: { plugins: [buildRouter()] } });
    await flushPromises();

    await wrapper.find('[data-testid="select-product-1"]').setValue(true);
    const unassignSpy = vi.spyOn(store, 'bulkUnassignCategory').mockResolvedValue({ updated: 1, skipped: 0 });
    vi.spyOn(store, 'fetchProducts').mockResolvedValue();

    await wrapper.find('[data-testid="bulk-assign-category-btn"]').trigger('click');
    await wrapper.find('[data-testid="bulk-category-select"]').setValue('cat-audio');
    await wrapper.find('[data-testid="bulk-category-unassign"]').trigger('click');
    await flushPromises();

    expect(unassignSpy).toHaveBeenCalledWith(['1'], 'cat-audio');
  });

  it('builds the tag_slugs list from the multi-select checkboxes and confirms with mode', async () => {
    grantPermissions(['*']);
    const store = useProductAdminStore();
    const wrapper = mount(Products, { global: { plugins: [buildRouter()] } });
    await flushPromises();

    await wrapper.find('[data-testid="select-product-1"]').setValue(true);
    await wrapper.find('[data-testid="select-product-2"]').setValue(true);

    const assignSpy = vi.spyOn(store, 'bulkAssignTags').mockResolvedValue({ updated: 2, skipped: 0 });
    const refreshSpy = vi.spyOn(store, 'fetchProducts').mockResolvedValue();

    await wrapper.find('[data-testid="bulk-assign-tags-btn"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-testid="bulk-tag-sale"]').setValue(true);
    await wrapper.find('[data-testid="bulk-tag-new"]').setValue(true);
    await wrapper.find('[data-testid="bulk-tags-mode"]').setValue('replace');
    await wrapper.find('[data-testid="bulk-tags-confirm"]').trigger('click');
    await flushPromises();

    expect(assignSpy).toHaveBeenCalledWith(['1', '2'], ['sale', 'new'], 'replace');
    expect(refreshSpy).toHaveBeenCalled();
    expect(wrapper.find('[data-testid="bulk-toolbar"]').exists()).toBe(false);
  });
});
