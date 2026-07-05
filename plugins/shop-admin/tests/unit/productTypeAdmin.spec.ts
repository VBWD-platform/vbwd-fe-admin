import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useProductTypeAdminStore } from '../../src/stores/productTypeAdmin';
import { api } from '@/api';

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

describe('useProductTypeAdminStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches active product types from the public endpoint', async () => {
    vi.mocked(api.get).mockResolvedValue({ product_types: [pharmaType, carsType] });

    const store = useProductTypeAdminStore();
    await store.fetchActiveProductTypes();

    expect(api.get).toHaveBeenCalledWith('/shop/product-types');
    expect(store.activeProductTypes).toHaveLength(2);
    expect(store.activeProductTypes[0].slug).toBe('pharma');
  });

  it('tolerates an empty/missing product_types payload', async () => {
    vi.mocked(api.get).mockResolvedValue({});

    const store = useProductTypeAdminStore();
    await store.fetchActiveProductTypes();

    expect(store.activeProductTypes).toEqual([]);
  });

  it('fetches all product types from the admin endpoint', async () => {
    vi.mocked(api.get).mockResolvedValue({ product_types: [pharmaType, carsType] });

    const store = useProductTypeAdminStore();
    await store.fetchProductTypes();

    expect(api.get).toHaveBeenCalledWith('/admin/shop/product-types');
    expect(store.productTypes).toHaveLength(2);
  });

  it('creates an admin product type', async () => {
    vi.mocked(api.post).mockResolvedValue({ product_type: carsType });

    const store = useProductTypeAdminStore();
    const created = await store.createProductType({
      slug: 'cars',
      name: 'Cars',
      product_type_fields: [],
    });

    expect(api.post).toHaveBeenCalledWith('/admin/shop/product-types', {
      slug: 'cars',
      name: 'Cars',
      product_type_fields: [],
    });
    expect(created?.slug).toBe('cars');
  });

  it('updates an admin product type by slug', async () => {
    vi.mocked(api.put).mockResolvedValue({ product_type: { ...carsType, name: 'Vehicles' } });

    const store = useProductTypeAdminStore();
    await store.updateProductType('cars', { name: 'Vehicles' });

    expect(api.put).toHaveBeenCalledWith('/admin/shop/product-types/cars', { name: 'Vehicles' });
  });

  it('deletes an admin product type by slug', async () => {
    vi.mocked(api.get).mockResolvedValue({ product_types: [carsType] });
    vi.mocked(api.delete).mockResolvedValue({});

    const store = useProductTypeAdminStore();
    await store.fetchProductTypes();
    await store.deleteProductType('cars');

    expect(api.delete).toHaveBeenCalledWith('/admin/shop/product-types/cars');
    expect(store.productTypes).toHaveLength(0);
  });

  it('records the error message when a create fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('slug already exists'));

    const store = useProductTypeAdminStore();
    await expect(
      store.createProductType({ slug: 'pharma', name: 'Dup' }),
    ).rejects.toThrow('slug already exists');
    expect(store.error).toBe('slug already exists');
  });
});
