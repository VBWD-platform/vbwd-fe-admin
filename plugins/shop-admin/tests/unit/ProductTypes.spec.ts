import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import ProductTypes from '../../src/views/ProductTypes.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

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

const pharmaType = {
  id: 'pt-1',
  slug: 'pharma',
  name: 'Pharma',
  description: 'Pharmaceutical products',
  product_type_fields: [
    { slug: 'atc_code', type: 'string', label: 'ATC code', required: false, options: [], help: null, sort_order: 1 },
  ],
  source: 'plugin',
  is_active: true,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
};

const carsType = {
  id: 'pt-2',
  slug: 'cars',
  name: 'Cars',
  description: null,
  product_type_fields: [],
  source: 'admin',
  is_active: true,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
};

function seedAuth(): void {
  configureAuthStore({
    storageKey: 'test_token',
    apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
  });
  const authStore = useAuthStore();
  authStore.$patch({
    user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
    token: 'test-token',
  });
}

describe('ProductTypes.vue — type management', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    seedAuth();
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ product_types: [pharmaType, carsType] });
  });

  it('lists all product types with a source badge', async () => {
    const wrapper = mount(ProductTypes);
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/shop/product-types');
    expect(wrapper.find('[data-testid="product-type-row-pharma"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="product-type-row-cars"]').exists()).toBe(true);
  });

  it('locks plugin-sourced types (no edit/delete, managed badge)', async () => {
    const wrapper = mount(ProductTypes);
    await flushPromises();

    expect(wrapper.find('[data-testid="product-type-managed-pharma"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="edit-product-type-pharma"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="delete-product-type-pharma"]').exists()).toBe(false);
  });

  it('allows edit/delete for admin-sourced types', async () => {
    const wrapper = mount(ProductTypes);
    await flushPromises();

    expect(wrapper.find('[data-testid="edit-product-type-cars"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="delete-product-type-cars"]').exists()).toBe(true);
  });

  it('creates an admin type with its field descriptors', async () => {
    vi.mocked(api.post).mockResolvedValue({ product_type: carsType });
    const wrapper = mount(ProductTypes);
    await flushPromises();

    await wrapper.find('[data-testid="create-product-type-btn"]').trigger('click');
    await wrapper.find('[data-testid="product-type-slug-input"]').setValue('cars');
    await wrapper.find('[data-testid="product-type-name-input"]').setValue('Cars');

    // Add a field descriptor row
    await wrapper.find('[data-testid="add-field-row-btn"]').trigger('click');
    await wrapper.find('[data-testid="field-slug-0"]').setValue('horsepower');
    await wrapper.find('[data-testid="field-type-0"]').setValue('integer');
    await wrapper.find('[data-testid="field-label-0"]').setValue('Horsepower');

    await wrapper.find('[data-testid="product-type-submit-btn"]').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith(
      '/admin/shop/product-types',
      expect.objectContaining({
        slug: 'cars',
        name: 'Cars',
        product_type_fields: [
          expect.objectContaining({ slug: 'horsepower', type: 'integer', label: 'Horsepower' }),
        ],
      }),
    );
  });

  it('deletes an admin type by slug', async () => {
    vi.mocked(api.delete).mockResolvedValue({});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const wrapper = mount(ProductTypes);
    await flushPromises();

    await wrapper.find('[data-testid="delete-product-type-cars"]').trigger('click');
    await flushPromises();

    expect(api.delete).toHaveBeenCalledWith('/admin/shop/product-types/cars');
  });
});
