import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// S120 — the geo-block store reuses the `api` singleton (no bespoke service),
// mirroring stores/routingRules.ts. The FROZEN backend contract is:
//   GET /admin/cms/geo-block -> { is_enabled, bypass_query, bypass_cookie_ttl_days,
//                                 blocked_target_slug, block_unknown_country,
//                                 allowed_country_codes, allowed_country_count }
//   PUT /admin/cms/geo-block  with { is_enabled, bypass_query, bypass_cookie_ttl_days,
//                                    blocked_target_slug, block_unknown_country }
vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}))

import { useGeoBlockStore } from '@/stores/geoBlock'
import { api } from '@/api'

const mockGet = vi.mocked(api.get)
const mockPut = vi.mocked(api.put)

const SAMPLE_CONFIG = {
  is_enabled: true,
  bypass_query: 'allowme=yes',
  bypass_cookie_ttl_days: 30,
  blocked_target_slug: '/locked',
  block_unknown_country: false,
  allowed_country_codes: ['DE', 'AT', 'CH'],
  allowed_country_count: 3,
}

describe('geoBlock store — fetchConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('GETs /admin/cms/geo-block and stores the config', async () => {
    mockGet.mockResolvedValue(SAMPLE_CONFIG)
    const store = useGeoBlockStore()

    await store.fetchConfig()

    expect(mockGet).toHaveBeenCalledWith('/admin/cms/geo-block')
    expect(store.config.is_enabled).toBe(true)
    expect(store.config.bypass_query).toBe('allowme=yes')
    expect(store.config.allowed_country_codes).toEqual(['DE', 'AT', 'CH'])
    expect(store.config.allowed_country_count).toBe(3)
  })

  it('sets error on fetch failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    const store = useGeoBlockStore()

    await store.fetchConfig()

    expect(store.error).toContain('Network error')
  })

  it('clears loading after fetch', async () => {
    mockGet.mockResolvedValue(SAMPLE_CONFIG)
    const store = useGeoBlockStore()

    await store.fetchConfig()

    expect(store.loading).toBe(false)
  })
})

describe('geoBlock store — saveConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('PUTs only the five writable fields (never the derived allowed_* fields)', async () => {
    mockPut.mockResolvedValue(SAMPLE_CONFIG)
    const store = useGeoBlockStore()

    await store.saveConfig({
      is_enabled: true,
      bypass_query: 'allowme=yes',
      bypass_cookie_ttl_days: 30,
      blocked_target_slug: '/locked',
      block_unknown_country: false,
    })

    expect(mockPut).toHaveBeenCalledWith('/admin/cms/geo-block', {
      is_enabled: true,
      bypass_query: 'allowme=yes',
      bypass_cookie_ttl_days: 30,
      blocked_target_slug: '/locked',
      block_unknown_country: false,
    })
  })

  it('updates the stored config from the PUT response', async () => {
    mockPut.mockResolvedValue(SAMPLE_CONFIG)
    const store = useGeoBlockStore()

    await store.saveConfig({
      is_enabled: true,
      bypass_query: 'allowme=yes',
      bypass_cookie_ttl_days: 30,
      blocked_target_slug: '/locked',
      block_unknown_country: false,
    })

    expect(store.config.is_enabled).toBe(true)
    expect(store.config.allowed_country_count).toBe(3)
  })

  it('surfaces a backend error and rethrows', async () => {
    mockPut.mockRejectedValue(new Error('Invalid bypass query'))
    const store = useGeoBlockStore()

    await expect(
      store.saveConfig({
        is_enabled: true,
        bypass_query: 'bad query',
        bypass_cookie_ttl_days: 30,
        blocked_target_slug: '/locked',
        block_unknown_country: false,
      }),
    ).rejects.toThrow('Invalid bypass query')
    expect(store.error).toContain('Invalid bypass query')
  })
})
