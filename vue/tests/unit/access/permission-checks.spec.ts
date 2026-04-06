/**
 * Unit tests for permission checks — Sprint 14c.
 *
 * Tests the auth store's hasPermission with wildcards,
 * and the usePermissions composable.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { configureAuthStore, useAuthStore } from 'vbwd-view-component'

// Mock API client
const mockApi = {
  post: async () => ({}),
  get: async () => ({}),
  setToken: () => {},
} as any

describe('Auth Store — hasPermission', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: mockApi,
    })
  })

  function setPermissions(permissions: string[]) {
    const store = useAuthStore()
    store.$patch({
      user: {
        id: 'test',
        email: 'test@example.com',
        role: 'ADMIN',
        permissions,
      },
      token: 'test-token',
    })
    return store
  }

  it('exact match returns true', () => {
    const store = setPermissions(['shop.products.view'])
    expect(store.hasPermission('shop.products.view')).toBe(true)
  })

  it('missing permission returns false', () => {
    const store = setPermissions(['shop.products.view'])
    expect(store.hasPermission('cms.pages.view')).toBe(false)
  })

  it('empty permissions returns false', () => {
    const store = setPermissions([])
    expect(store.hasPermission('anything')).toBe(false)
  })

  it('wildcard * matches everything', () => {
    const store = setPermissions(['*'])
    expect(store.hasPermission('shop.products.view')).toBe(true)
    expect(store.hasPermission('cms.pages.manage')).toBe(true)
    expect(store.hasPermission('settings.system')).toBe(true)
  })

  it('plugin wildcard shop.* matches shop permissions', () => {
    const store = setPermissions(['shop.*'])
    expect(store.hasPermission('shop.products.view')).toBe(true)
    expect(store.hasPermission('shop.orders.manage')).toBe(true)
  })

  it('plugin wildcard shop.* does NOT match other plugins', () => {
    const store = setPermissions(['shop.*'])
    expect(store.hasPermission('cms.pages.view')).toBe(false)
    expect(store.hasPermission('booking.resources.view')).toBe(false)
  })

  it('multiple permissions — each accessible', () => {
    const store = setPermissions([
      'shop.products.view',
      'cms.pages.view',
      'invoices.view',
    ])
    expect(store.hasPermission('shop.products.view')).toBe(true)
    expect(store.hasPermission('cms.pages.view')).toBe(true)
    expect(store.hasPermission('invoices.view')).toBe(true)
    expect(store.hasPermission('booking.resources.view')).toBe(false)
  })
})

describe('Auth Store — isAdmin', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: mockApi,
    })
  })

  it('super-admin role is admin', () => {
    const store = useAuthStore()
    store.$patch({
      user: { id: 'a', email: 'a@a.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 't',
    })
    expect(store.isAdmin).toBe(true)
  })

  it('admin role is admin', () => {
    const store = useAuthStore()
    store.$patch({
      user: { id: 'a', email: 'a@a.com', role: 'ADMIN', permissions: [] },
      token: 't',
    })
    expect(store.isAdmin).toBe(true)
  })

  it('user role is NOT admin', () => {
    const store = useAuthStore()
    store.$patch({
      user: { id: 'a', email: 'a@a.com', role: 'USER', permissions: [] },
      token: 't',
    })
    expect(store.isAdmin).toBe(false)
  })

  it('custom role is NOT admin', () => {
    const store = useAuthStore()
    store.$patch({
      user: { id: 'a', email: 'a@a.com', role: 'USER', permissions: ['cms.pages.view'] },
      token: 't',
    })
    expect(store.isAdmin).toBe(false)
  })
})
