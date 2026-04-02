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
    is_digital: false,
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

  it('sets error on fetch failure', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    const store = useProductAdminStore()
    await store.fetchProducts()

    expect(store.error).toBe('Network error')
    expect(store.loading).toBe(false)
  })
})
