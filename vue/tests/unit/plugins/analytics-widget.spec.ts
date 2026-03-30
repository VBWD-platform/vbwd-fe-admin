import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { analyticsWidgetPlugin } from '@plugins/analytics-widget/index'
import AnalyticsWidget from '@plugins/analytics-widget/AnalyticsWidget.vue'
import { PlatformSDK } from 'vbwd-view-component'
import { api } from '@/api'

// Mock the API module
vi.mock('@/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn()
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn()
}))

describe('analytics-widget plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('plugin metadata', () => {
    it('has correct name', () => {
      expect(analyticsWidgetPlugin.name).toBe('analytics-widget')
    })

    it('has correct version', () => {
      expect(analyticsWidgetPlugin.version).toBe('1.0.0')
    })

    it('has a description', () => {
      expect(analyticsWidgetPlugin.description).toBeTruthy()
    })
  })

  describe('plugin lifecycle', () => {
    it('has install method', () => {
      expect(typeof analyticsWidgetPlugin.install).toBe('function')
    })

    it('has activate method', () => {
      expect(typeof analyticsWidgetPlugin.activate).toBe('function')
    })

    it('has deactivate method', () => {
      expect(typeof analyticsWidgetPlugin.deactivate).toBe('function')
    })

    it('registers AnalyticsWidget component via install', () => {
      const sdk = new PlatformSDK()
      analyticsWidgetPlugin.install!(sdk)

      const components = sdk.getComponents()
      expect(components).toHaveProperty('AnalyticsWidget')
      expect(typeof components['AnalyticsWidget']).toBe('function')
    })

    it('sets _active flag on activate', () => {
      const plugin = analyticsWidgetPlugin as typeof analyticsWidgetPlugin & { _active: boolean }
      plugin._active = false
      plugin.activate!()
      expect(plugin._active).toBe(true)
    })

    it('clears _active flag on deactivate', () => {
      const plugin = analyticsWidgetPlugin as typeof analyticsWidgetPlugin & { _active: boolean }
      plugin._active = true
      plugin.deactivate!()
      expect(plugin._active).toBe(false)
    })
  })
})

describe('AnalyticsWidget component', () => {
  const globalMocks = { global: { mocks: { $t: (key: string) => key } } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with data-testid', () => {
    vi.mocked(api.get).mockResolvedValue({ count: 0 })
    const wrapper = mount(AnalyticsWidget, globalMocks)
    expect(wrapper.find('[data-testid="analytics-widget"]').exists()).toBe(true)
  })

  it('shows loading state initially', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    const wrapper = mount(AnalyticsWidget, globalMocks)
    expect(wrapper.find('.stat-value').text()).toBe('...')
  })

  it('shows count after successful API call', async () => {
    vi.mocked(api.get).mockResolvedValue({ count: 42 })
    const wrapper = mount(AnalyticsWidget, globalMocks)

    await flushPromises()

    const countEl = wrapper.find('[data-testid="active-sessions-count"]')
    expect(countEl.exists()).toBe(true)
    expect(countEl.text()).toBe('42')
  })

  it('calls the correct API endpoint', async () => {
    vi.mocked(api.get).mockResolvedValue({ count: 10 })
    mount(AnalyticsWidget, globalMocks)

    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/plugins/analytics/active-sessions')
  })

  it('shows 0 when API call fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
    const wrapper = mount(AnalyticsWidget, globalMocks)

    await flushPromises()

    const countEl = wrapper.find('[data-testid="active-sessions-count"]')
    expect(countEl.exists()).toBe(true)
    expect(countEl.text()).toBe('0')
  })

  it('shows 0 when API returns no count', async () => {
    vi.mocked(api.get).mockResolvedValue({})
    const wrapper = mount(AnalyticsWidget, globalMocks)

    await flushPromises()

    const countEl = wrapper.find('[data-testid="active-sessions-count"]')
    expect(countEl.text()).toBe('0')
  })

  it('displays "from plugin" label', async () => {
    vi.mocked(api.get).mockResolvedValue({ count: 5 })
    const wrapper = mount(AnalyticsWidget, globalMocks)

    await flushPromises()

    expect(wrapper.find('.stat-label').text()).toBe('analytics.fromPlugin')
  })

  it('displays "Active Sessions" heading', () => {
    vi.mocked(api.get).mockResolvedValue({ count: 0 })
    const wrapper = mount(AnalyticsWidget, globalMocks)
    expect(wrapper.find('h3').text()).toBe('analytics.activeSessions')
  })
})
