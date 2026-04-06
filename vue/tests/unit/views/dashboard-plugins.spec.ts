import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Dashboard from '@/views/Dashboard.vue'
import { PlatformSDK } from 'vbwd-view-component'
import type { ComponentDefinition } from 'vbwd-view-component'
import { h, nextTick } from 'vue'

// Mock the API module
vi.mock('@/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn().mockResolvedValue({
      mrr: { total: 1000, change_percent: 5 },
      revenue: { total: 5000, change_percent: 3 },
      user_growth: { total: 100, change_percent: 10 },
      churn: { total: 2.5, change_percent: -0.5 },
      arpu: { total: 50, change_percent: 2 },
      conversion: { total: 15, change_percent: 1 }
    }),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn()
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn()
}))

// Mock stores used by Dashboard (dynamically imported in onMounted)
vi.mock('@/stores/plugins', () => ({
  usePluginsStore: () => ({
    plugins: [],
    fetchPlugins: vi.fn().mockResolvedValue([])
  })
}))

vi.mock('@/stores/analytics', () => ({
  useAnalyticsStore: () => ({
    loading: false,
    error: null,
    dashboard: {
      mrr: { total: 1000, change_percent: 5 },
      revenue: { total: 5000, change_percent: 3 },
      user_growth: { total: 100, change_percent: 10 },
      churn: { total: 2.5, change_percent: -0.5 },
      arpu: { total: 50, change_percent: 2 },
      conversion: { total: 15, change_percent: 1 },
    },
    fetchDashboard: vi.fn().mockResolvedValue({}),
  })
}))

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    install: vi.fn(),
    global: { t: (key: string) => key }
  },
  initLocale: vi.fn(),
  setLocale: vi.fn(),
  availableLocales: ['en', 'de']
}))

const TestWidget = {
  name: 'TestWidget',
  render() {
    return h('div', { 'data-testid': 'test-widget' }, 'Test Widget Content')
  }
}

const AnotherWidget = {
  name: 'AnotherWidget',
  render() {
    return h('div', { 'data-testid': 'another-widget' }, 'Another Widget')
  }
}

function mountDashboard(sdk?: PlatformSDK) {
  return mount(Dashboard, {
    global: {
      plugins: [createPinia()],
      provide: sdk ? { platformSDK: sdk } : {},
      mocks: {
        $t: (key: string) => key
      }
    }
  })
}

describe('Dashboard Plugin Widgets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('renders plugin widgets from SDK', async () => {
    const sdk = new PlatformSDK()
    sdk.addComponent('TestWidget', (() => Promise.resolve(TestWidget)) as unknown as ComponentDefinition)

    const wrapper = mountDashboard(sdk)
    await flushPromises()
    await nextTick()
    await flushPromises()
    await nextTick()
    await flushPromises()

    expect(wrapper.find('[data-testid="test-widget"]').exists()).toBe(true)
  })

  it('renders no widgets when SDK has no components', async () => {
    const sdk = new PlatformSDK()

    const wrapper = mountDashboard(sdk)
    await flushPromises()

    expect(wrapper.find('.plugin-widgets').exists()).toBe(true)
    expect(wrapper.findAll('.plugin-widgets > *')).toHaveLength(0)
  })

  it('renders multiple widgets', async () => {
    const sdk = new PlatformSDK()
    sdk.addComponent('TestWidget', (() => Promise.resolve(TestWidget)) as unknown as ComponentDefinition)
    sdk.addComponent('AnotherWidget', (() => Promise.resolve(AnotherWidget)) as unknown as ComponentDefinition)

    const wrapper = mountDashboard(sdk)
    await flushPromises()
    await nextTick()
    await flushPromises()
    await nextTick()
    await flushPromises()

    expect(wrapper.find('[data-testid="test-widget"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="another-widget"]').exists()).toBe(true)
  })
})
