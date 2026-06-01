/**
 * Regression: selecting a checkbox on the Access Levels page must NOT hide the
 * table. The bulk-actions bar used to share a v-if/v-else-if chain with the
 * table, so toggling a checkbox (selectedIds.size > 0) hid the table.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, getActivePinia } from 'pinia'
import AccessLevels from '@/views/AccessLevels.vue'
import { configureAuthStore, useAuthStore } from '@/stores/auth'
import { extensionRegistry } from '@/plugins/extensionRegistry'

const mockGet = vi.fn()

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}))

const adminLevels = [
  { id: 'a1', name: 'Editor', slug: 'editor', description: '', is_system: false, permissions: [] },
  { id: 'a2', name: 'Super', slug: 'super', description: '', is_system: true, permissions: ['*'] },
]

function mountComponent() {
  return mount(AccessLevels, {
    global: {
      plugins: [getActivePinia()!],
      stubs: {
        'router-link': { template: '<a><slot /></a>', props: ['to'] },
      },
      mocks: { $t: (key: string) => key },
    },
  })
}

describe('AccessLevels — checkbox selection keeps the table visible', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    extensionRegistry.clear()
    setActivePinia(createPinia())
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {} } as never,
    })
    useAuthStore().$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    })
    mockGet.mockImplementation((url: string) =>
      url.includes('user-levels')
        ? Promise.resolve({ levels: [] })
        : Promise.resolve({ levels: adminLevels })
    )
  })

  it('keeps the table rendered after a row checkbox is selected', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    // Table visible after load.
    expect(wrapper.find('table.data-table').exists()).toBe(true)

    // Select the first (non-system) row's checkbox.
    const rowCheckbox = wrapper.find('tbody input[type="checkbox"]')
    expect(rowCheckbox.exists()).toBe(true)
    await rowCheckbox.trigger('change')
    await flushPromises()

    // Table must STILL be visible, and the bulk-actions bar appears above it.
    expect(wrapper.find('table.data-table').exists()).toBe(true)
    expect(wrapper.find('.bulk-actions').exists()).toBe(true)
  })
})

describe('AccessLevels — system roles deletable only by a super admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    extensionRegistry.clear()
    setActivePinia(createPinia())
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {} } as never,
    })
    mockGet.mockImplementation((url: string) =>
      url.includes('user-levels')
        ? Promise.resolve({ levels: [] })
        : Promise.resolve({ levels: adminLevels })
    )
  })

  function deleteButtons(wrapper: ReturnType<typeof mountComponent>) {
    return wrapper
      .findAll('tbody button.btn--danger')
      .filter((b) => b.text().trim() === 'Delete')
  }

  it('shows a Delete button on the system role for a SUPER_ADMIN', async () => {
    useAuthStore().$patch({
      user: { id: '1', email: 'super@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    })
    const wrapper = mountComponent()
    await flushPromises()
    // Both the non-system (Editor) and system (Super) rows are deletable.
    expect(deleteButtons(wrapper)).toHaveLength(adminLevels.length)
  })

  it('hides the Delete button on the system role for an ordinary ADMIN', async () => {
    useAuthStore().$patch({
      user: { id: '2', email: 'admin@test.com', role: 'ADMIN', permissions: ['settings.system'] },
      token: 'test-token',
    })
    const wrapper = mountComponent()
    await flushPromises()
    // Only the non-system row is deletable; the system row's Delete is hidden.
    const buttons = deleteButtons(wrapper)
    expect(buttons).toHaveLength(adminLevels.filter((l) => !l.is_system).length)
  })
})
