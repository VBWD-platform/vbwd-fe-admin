/**
 * RoutingRulesTab — bulk delete + Import/Export controls (S120 follow-up).
 *
 * Mirrors AccessLevels.vue / UserGroups.vue: a leading checkbox column with a
 * select-all header checkbox, a bulk-actions toolbar rendered ABOVE the table,
 * and the generic ImportExportControls for the ``cms_routing_rules`` entity.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, getActivePinia } from 'pinia'
import RoutingRulesTab from '@/views/RoutingRulesTab.vue'
import { configureAuthStore, useAuthStore } from '@/stores/auth'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}))

vi.mock('@/composables/useDataExchangeManifest', () => ({
  useDataExchangeManifest: () => ({
    load: vi.fn(),
    capabilitiesFor: () => ({
      can_export: true,
      can_import: true,
      can_export_pii: false,
      supported_formats: ['json', 'csv'],
    }),
  }),
}))

vi.mock('@/api/dataExchangeApi', () => ({
  createDataExchangeApi: () => ({}),
}))

const rules = [
  {
    id: 'rule-1',
    name: 'German redirect',
    is_active: true,
    priority: 0,
    match_type: 'language',
    match_value: 'de',
    target_slug: 'de/home',
    redirect_code: 302,
    is_rewrite: false,
    layer: 'middleware',
    created_at: null,
    updated_at: null,
  },
  {
    id: 'rule-2',
    name: 'Nginx redirect',
    is_active: true,
    priority: 1,
    match_type: 'path',
    match_value: '/old',
    target_slug: '/new',
    redirect_code: 301,
    is_rewrite: false,
    layer: 'nginx',
    created_at: null,
    updated_at: null,
  },
]

function mountComponent() {
  return mount(RoutingRulesTab, {
    global: {
      plugins: [getActivePinia()!],
      stubs: {
        ImportExportControls: { template: '<div data-testid="import-export-stub" />' },
        RoutingRuleForm: { template: '<div />' },
      },
      mocks: { $t: (key: string) => key },
    },
  })
}

describe('RoutingRulesTab — bulk delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {} } as never,
    })
    useAuthStore().$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    })
    mockGet.mockResolvedValue(rules)
    mockPost.mockResolvedValue({ deleted: 1 })
  })

  it('reveals the bulk-actions toolbar after selecting a row checkbox', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-testid="bulk-delete-btn"]').exists()).toBe(false)
    await wrapper.find('[data-testid="rule-check-rule-1"]').trigger('change')
    await flushPromises()

    expect(wrapper.find('[data-testid="bulk-delete-btn"]').exists()).toBe(true)
    // Table stays visible above the toolbar.
    expect(wrapper.find('table.plans-table').exists()).toBe(true)
  })

  it('bulk-deletes selected rows via the bulk endpoint on confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('[data-testid="rule-check-rule-1"]').trigger('change')
    await flushPromises()
    await wrapper.find('[data-testid="bulk-delete-btn"]').trigger('click')
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith('/admin/cms/routing-rules/bulk', { ids: ['rule-1'] })
    // Selection cleared after delete → toolbar hidden again.
    expect(wrapper.find('[data-testid="bulk-delete-btn"]').exists()).toBe(false)
  })

  it('select-all header checkbox selects the whole filtered set', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('[data-testid="rule-check-all"]').trigger('change')
    await flushPromises()

    expect(wrapper.text()).toContain('2 selected')
  })
})

describe('RoutingRulesTab — Import/Export controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {} } as never,
    })
    useAuthStore().$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    })
    mockGet.mockResolvedValue(rules)
  })

  it('renders the import/export controls when capabilities allow', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    expect(wrapper.find('[data-testid="import-export-stub"]').exists()).toBe(true)
  })
})
