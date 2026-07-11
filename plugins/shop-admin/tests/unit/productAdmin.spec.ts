import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProductAdminStore } from '../../src/stores/productAdmin'
import { api } from '@/api'

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
}))

const mockProducts = [
  {
    id: '1',
    name: 'Headphones',
    slug: 'headphones',
    sku: 'ELEC-001',
    price: '79.99',
    currency: 'EUR',
    price_float: 79.99,
    is_active: true,
    has_variants: false,
    primary_image_url: null,
    images: [],
    variants: [],
    categories: [],
    created_at: '2026-01-01T00:00:00',
  },
]

describe('useProductAdminStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches products', async () => {
    vi.mocked(api.get).mockResolvedValue({
      products: mockProducts,
      page: 1,
      per_page: 25,
    })

    const store = useProductAdminStore()
    await store.fetchProducts()

    expect(api.get).toHaveBeenCalledWith('/admin/shop/products', {
      params: { page: 1, per_page: 25 },
    })
    expect(store.products).toHaveLength(1)
    expect(store.products[0].name).toBe('Headphones')
    expect(store.loading).toBe(false)
  })

  it('creates product', async () => {
    vi.mocked(api.post).mockResolvedValue({
      product: mockProducts[0],
    })

    const store = useProductAdminStore()
    const product = await store.createProduct({ name: 'Headphones', price: '79.99' })

    expect(api.post).toHaveBeenCalledWith('/admin/shop/products', { name: 'Headphones', price: '79.99' })
    expect(product.name).toBe('Headphones')
    expect(store.products).toHaveLength(1)
  })

  it('deletes product', async () => {
    vi.mocked(api.delete).mockResolvedValue({})
    vi.mocked(api.get).mockResolvedValue({ products: mockProducts, page: 1, per_page: 25 })

    const store = useProductAdminStore()
    await store.fetchProducts()
    expect(store.products).toHaveLength(1)

    await store.deleteProduct('1')
    expect(api.delete).toHaveBeenCalledWith('/admin/shop/products/1')
    expect(store.products).toHaveLength(0)
  })

  it('bulk-copies products with a product_ids payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ products: [], count: 2 })

    const store = useProductAdminStore()
    await store.bulkCopyProducts(['1', '2'])

    // The shop bulk routes all key on `product_ids` (not `ids`) — asserting the
    // exact key guards the easiest-to-get-wrong part of the contract.
    expect(api.post).toHaveBeenCalledWith('/admin/shop/products/bulk-copy', {
      product_ids: ['1', '2'],
    })
  })

  it('bulk-assigns a category with product_ids + category_id + mode, returning the result', async () => {
    vi.mocked(api.post).mockResolvedValue({ updated: 2, skipped: 0 })

    const store = useProductAdminStore()
    const result = await store.bulkAssignCategory(['1', '2'], 'cat-electronics', 'replace')

    expect(api.post).toHaveBeenCalledWith('/admin/shop/products/bulk/assign-category', {
      product_ids: ['1', '2'],
      category_id: 'cat-electronics',
      mode: 'replace',
    })
    expect(result).toEqual({ updated: 2, skipped: 0 })
  })

  it('defaults the category assign mode to "add"', async () => {
    vi.mocked(api.post).mockResolvedValue({ updated: 1, skipped: 0 })

    const store = useProductAdminStore()
    await store.bulkAssignCategory(['1'], 'cat-electronics')

    expect(api.post).toHaveBeenCalledWith('/admin/shop/products/bulk/assign-category', {
      product_ids: ['1'],
      category_id: 'cat-electronics',
      mode: 'add',
    })
  })

  it('bulk-unassigns a category with product_ids + category_id', async () => {
    vi.mocked(api.post).mockResolvedValue({ updated: 2, skipped: 1 })

    const store = useProductAdminStore()
    const result = await store.bulkUnassignCategory(['1', '2'], 'cat-electronics')

    expect(api.post).toHaveBeenCalledWith('/admin/shop/products/bulk/unassign-category', {
      product_ids: ['1', '2'],
      category_id: 'cat-electronics',
    })
    expect(result).toEqual({ updated: 2, skipped: 1 })
  })

  it('bulk-assigns tags with product_ids + tag_slugs + mode', async () => {
    vi.mocked(api.post).mockResolvedValue({ updated: 2, skipped: 0 })

    const store = useProductAdminStore()
    const result = await store.bulkAssignTags(['1', '2'], ['sale', 'new'], 'add')

    expect(api.post).toHaveBeenCalledWith('/admin/shop/products/bulk/assign-tags', {
      product_ids: ['1', '2'],
      tag_slugs: ['sale', 'new'],
      mode: 'add',
    })
    expect(result).toEqual({ updated: 2, skipped: 0 })
  })

  it('defaults the tag assign mode to "add"', async () => {
    vi.mocked(api.post).mockResolvedValue({ updated: 1, skipped: 0 })

    const store = useProductAdminStore()
    await store.bulkAssignTags(['1'], ['sale'])

    expect(api.post).toHaveBeenCalledWith('/admin/shop/products/bulk/assign-tags', {
      product_ids: ['1'],
      tag_slugs: ['sale'],
      mode: 'add',
    })
  })

  it('sets error on fetch failure', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    const store = useProductAdminStore()
    await store.fetchProducts()

    expect(store.error).toBe('Network error')
    expect(store.loading).toBe(false)
  })
})
