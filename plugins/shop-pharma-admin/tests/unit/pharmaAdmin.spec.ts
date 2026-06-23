import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePharmaAdminStore } from '../../src/stores/pharmaAdmin';
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

const mockRegion = {
  country_code: 'DE',
  name: 'Germany',
  locale: 'de-DE',
  display_currency: 'EUR',
  national_code_scheme: 'PZN',
  national_register_url: 'https://example/register',
  registered_pharmacy_logo_url: 'https://example/logo.png',
  pharmacovigilance_url: 'https://example/pv',
  withdrawal_right_copy: 'copy',
  default_age_restriction_years: 0,
  default_max_quantity_per_order: 5,
  regime: 'EU',
  operator_verify: true,
};

const mockProduct = (klass: string, slug: string) => ({
  id: `id-${slug}`,
  name: slug,
  slug,
  price: 9.99,
  primary_image_url: null,
  pharma_profile: { product_class: klass, active_substances: [] },
});

describe('usePharmaAdminStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches the active region from /pharma/region (no hardcoded jurisdiction)', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ region: mockRegion });
    const store = usePharmaAdminStore();
    const region = await store.fetchRegion();
    expect(api.get).toHaveBeenCalledWith('/pharma/region');
    expect(region?.national_code_scheme).toBe('PZN');
    expect(store.region?.registered_pharmacy_logo_url).toBe('https://example/logo.png');
  });

  it('fetches admin pharma products and groups them by product_class', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      products: [
        mockProduct('RX', 'amoxicillin'),
        mockProduct('OTC', 'ibuprofen'),
        mockProduct('OTC', 'paracetamol'),
      ],
    });
    const store = usePharmaAdminStore();
    await store.fetchProducts();
    expect(api.get).toHaveBeenCalledWith('/admin/pharma/products');
    expect(store.products).toHaveLength(3);
    expect(store.productsByClass.RX).toHaveLength(1);
    expect(store.productsByClass.OTC).toHaveLength(2);
  });

  it('creates a product via the pharma admin API', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      product: { ...mockProduct('OTC', 'new'), variants: [] },
    });
    const store = usePharmaAdminStore();
    const payload = { name: 'New', slug: 'new', pharma_profile: { product_class: 'OTC' } };
    await store.createProduct(payload);
    expect(api.post).toHaveBeenCalledWith('/admin/pharma/products', payload);
  });

  it('surfaces the backend RequiredFieldsByClass rejection (400 missing) verbatim', async () => {
    const apiError = Object.assign(new Error("Class 'OTC' requires: active_substances, strength"), {
      status: 400,
    });
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(apiError);
    const store = usePharmaAdminStore();
    await expect(store.createProduct({})).rejects.toBeTruthy();
    expect(store.lastRejection?.missing).toEqual(['active_substances', 'strength']);
    expect(store.lastRejection?.message).toContain("Class 'OTC' requires");
  });

  it('drives pack variants through the shop variant authoring API', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      variant: { id: 'v1', name: 'Pack of 20', sku: 'PZN-1', price: '12.50', attributes: {}, is_active: true, weight: null },
    });
    const store = usePharmaAdminStore();
    await store.createVariant('prod-1', { name: 'Pack of 20', price: 12.5, sku: 'PZN-1' });
    expect(api.post).toHaveBeenCalledWith(
      '/admin/shop/products/prod-1/variants',
      { name: 'Pack of 20', price: 12.5, sku: 'PZN-1' },
    );

    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({});
    await store.reorderVariants('prod-1', ['v2', 'v1']);
    expect(api.post).toHaveBeenCalledWith(
      '/admin/shop/products/prod-1/variants/reorder',
      { variant_ids: ['v2', 'v1'] },
    );
  });
});
