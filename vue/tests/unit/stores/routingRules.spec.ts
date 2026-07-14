import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

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

import { useRoutingRulesStore } from '@/stores/routingRules'
import { api } from '@/api'

const mockGet = vi.mocked(api.get)
const mockPost = vi.mocked(api.post)
const mockPut = vi.mocked(api.put)
const mockDelete = vi.mocked(api.delete)

const SAMPLE_RULE = {
  id: 'rule-1',
  name: 'German redirect',
  is_active: true,
  priority: 0,
  match_type: 'language',
  match_value: 'de',
  target_slug: 'de/home',
  redirect_code: 302 as const,
  is_rewrite: false,
  layer: 'middleware' as const,
  created_at: null,
  updated_at: null,
}

describe('routingRules store — fetchRules', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('populates rules on fetch', async () => {
    mockGet.mockResolvedValue([SAMPLE_RULE])
    const store = useRoutingRulesStore()
    await store.fetchRules()
    expect(store.rules).toHaveLength(1)
    expect(store.rules[0].name).toBe('German redirect')
  })

  it('sets error on fetch failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    const store = useRoutingRulesStore()
    await store.fetchRules()
    expect(store.error).toContain('Network error')
    expect(store.rules).toHaveLength(0)
  })

  it('sets loading to false after fetch', async () => {
    mockGet.mockResolvedValue([])
    const store = useRoutingRulesStore()
    await store.fetchRules()
    expect(store.loading).toBe(false)
  })
})

describe('routingRules store — createRule', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('appends created rule to rules array', async () => {
    mockPost.mockResolvedValue(SAMPLE_RULE)
    const store = useRoutingRulesStore()
    await store.createRule({ ...SAMPLE_RULE })
    expect(store.rules).toHaveLength(1)
  })
})

describe('routingRules store — deleteRule', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('removes deleted rule from rules array', async () => {
    mockGet.mockResolvedValue([SAMPLE_RULE])
    mockDelete.mockResolvedValue(undefined)
    const store = useRoutingRulesStore()
    await store.fetchRules()
    await store.deleteRule('rule-1')
    expect(store.rules).toHaveLength(0)
  })
})

describe('routingRules store — updateRule', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('updates rule in rules array', async () => {
    mockGet.mockResolvedValue([SAMPLE_RULE])
    mockPut.mockResolvedValue({ ...SAMPLE_RULE, name: 'Updated' })
    const store = useRoutingRulesStore()
    await store.fetchRules()
    await store.updateRule('rule-1', { name: 'Updated' })
    expect(store.rules[0].name).toBe('Updated')
  })
})

describe('routingRules store — bulkDelete', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('posts the ids to the bulk endpoint and removes them from rules', async () => {
    const ruleTwo = { ...SAMPLE_RULE, id: 'rule-2', name: 'Second' }
    mockGet.mockResolvedValue([SAMPLE_RULE, ruleTwo])
    mockPost.mockResolvedValue({ deleted: 1 })
    const store = useRoutingRulesStore()
    await store.fetchRules()
    await store.bulkDelete(['rule-1'])
    expect(mockPost).toHaveBeenCalledWith('/admin/cms/routing-rules/bulk', { ids: ['rule-1'] })
    expect(store.rules).toHaveLength(1)
    expect(store.rules[0].id).toBe('rule-2')
  })

  it('removes all supplied ids from rules', async () => {
    const ruleTwo = { ...SAMPLE_RULE, id: 'rule-2', name: 'Second' }
    mockGet.mockResolvedValue([SAMPLE_RULE, ruleTwo])
    mockPost.mockResolvedValue({ deleted: 2 })
    const store = useRoutingRulesStore()
    await store.fetchRules()
    await store.bulkDelete(['rule-1', 'rule-2'])
    expect(store.rules).toHaveLength(0)
  })
})

describe('routingRules store — reloadNginx', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('calls POST reload endpoint', async () => {
    mockPost.mockResolvedValue({ reloaded: true, message: 'ok' })
    const store = useRoutingRulesStore()
    const result = await store.reloadNginx()
    expect(result.reloaded).toBe(true)
    expect(mockPost).toHaveBeenCalledWith('/admin/cms/routing-rules/reload', {})
  })

  it('sets lastReloadAt after reload', async () => {
    mockPost.mockResolvedValue({ reloaded: true, message: 'ok' })
    const store = useRoutingRulesStore()
    await store.reloadNginx()
    expect(store.lastReloadAt).not.toBeNull()
  })
})
