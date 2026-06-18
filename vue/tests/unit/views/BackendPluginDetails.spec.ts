import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, getActivePinia } from 'pinia'
import BackendPluginDetails from '@/views/BackendPluginDetails.vue'
import { configureAuthStore, useAuthStore } from '@/stores/auth'

// Mock the API module
const mockGet = vi.fn()
const mockPut = vi.fn()
const mockPost = vi.fn()

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn()
  }
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

// Mock vue-router
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { pluginName: 'backend-demo-plugin' }
  }),
  useRouter: () => ({
    push: vi.fn()
  })
}))

const mockPluginDetail = {
  name: 'backend-demo-plugin',
  version: '1.0.0',
  author: 'VBWD Team',
  description: 'Demo plugin',
  status: 'inactive',
  dependencies: [],
  configSchema: {
    greeting: { type: 'string', default: 'Hello!', description: 'Greeting message' },
    requireAdmin: { type: 'boolean', default: false, description: 'Require admin role' }
  },
  adminConfig: {
    tabs: [
      {
        id: 'general',
        label: 'General',
        fields: [
          { key: 'greeting', label: 'Greeting Message', component: 'input', inputType: 'text' },
          { key: 'requireAdmin', label: 'Require Admin Access', component: 'checkbox' }
        ]
      }
    ]
  },
  savedConfig: { greeting: 'Custom Hello' }
}

function mountComponent() {
  return mount(BackendPluginDetails, {
    global: {
      plugins: [getActivePinia()!],
      stubs: {
        'router-link': {
          template: '<a><slot /></a>',
          props: ['to']
        }
      },
      mocks: {
        $t: (key: string) => key
      }
    }
  })
}

describe('BackendPluginDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {} } as any,
    })
    const authStore = useAuthStore()
    authStore.$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    })
    mockGet.mockResolvedValue(mockPluginDetail)
    mockPut.mockResolvedValue({ message: 'Configuration saved' })
    mockPost.mockResolvedValue({ message: 'Plugin enabled', status: 'enabled' })
  })

  it('renders plugin header with name, version, status', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-testid="plugin-name"]').text()).toBe('backend-demo-plugin')
    expect(wrapper.find('.plugin-version').text()).toBe('v1.0.0')
    expect(wrapper.find('[data-testid="plugin-status"]').exists()).toBe(true)
  })

  it('renders config tabs from API response', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-testid="config-tabs"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="config-tab-general"]').exists()).toBe(true)
  })

  it('renders config fields', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-testid="config-field-greeting"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="config-field-requireAdmin"]').exists()).toBe(true)
  })

  it('initializes config values from saved config over defaults', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    // greeting should use savedConfig value "Custom Hello" instead of default "Hello!"
    const greetingInput = wrapper.find('[data-testid="config-input-greeting"]')
    expect((greetingInput.element as HTMLInputElement).value).toBe('Custom Hello')
  })

  it('saves config via API on save button click', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('[data-testid="save-config-btn"]').trigger('click')
    await flushPromises()

    expect(mockPut).toHaveBeenCalledWith(
      '/admin/plugins/backend-demo-plugin/config',
      expect.objectContaining({ greeting: 'Custom Hello' })
    )
  })

  it('shows activate button when plugin is inactive', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-testid="activate-plugin-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deactivate-plugin-btn"]').exists()).toBe(false)
  })

  it('shows deactivate button when plugin is active', async () => {
    mockGet.mockResolvedValue({ ...mockPluginDetail, status: 'active' })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-testid="deactivate-plugin-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="activate-plugin-btn"]').exists()).toBe(false)
  })

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {})) // Never resolves
    const wrapper = mountComponent()

    expect(wrapper.find('[data-testid="plugin-loading"]').exists()).toBe(true)
  })

  it('shows error state on API failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-testid="plugin-error"]').exists()).toBe(true)
  })

  it('renders an action field as a button and POSTs the declared endpoint on click', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockPost.mockResolvedValue({ affected: 3 })
    mockGet.mockResolvedValue({
      ...mockPluginDetail,
      adminConfig: {
        tabs: [{
          id: 'guest-economy',
          label: 'Guest economy',
          fields: [{
            key: 'reset_all_guest_tokens',
            label: 'Reset all guest token balances',
            component: 'action',
            endpoint: '/admin/meinchat/guests/tokens',
            method: 'POST',
            payload: { mode: 'reset' },
            confirm: 'Reset every guest?',
            successMessage: 'Guest token balances reset.',
          }],
        }],
      },
    })

    const wrapper = mountComponent()
    await flushPromises()

    const btn = wrapper.find('[data-testid="config-action-reset_all_guest_tokens"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalledWith('Reset every guest?')
    expect(mockPost).toHaveBeenCalledWith('/admin/meinchat/guests/tokens', { mode: 'reset' })
    expect(wrapper.find('[data-testid="config-action-result-reset_all_guest_tokens"]').text())
      .toBe('Guest token balances reset.')
    // An action field must NOT push a config value into the save payload.
    await wrapper.find('[data-testid="save-config-btn"]').trigger('click')
    await flushPromises()
    const savedBody = mockPut.mock.calls.at(-1)?.[1] as Record<string, unknown>
    expect('reset_all_guest_tokens' in savedBody).toBe(false)
    confirmSpy.mockRestore()
  })

  it('does not call the endpoint when the confirm is dismissed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockGet.mockResolvedValue({
      ...mockPluginDetail,
      adminConfig: {
        tabs: [{
          id: 'guest-economy', label: 'Guest economy',
          fields: [{
            key: 'reset_all_guest_tokens', label: 'Reset', component: 'action',
            endpoint: '/admin/meinchat/guests/tokens', method: 'POST',
            payload: { mode: 'reset' }, confirm: 'Sure?',
          }],
        }],
      },
    })
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('[data-testid="config-action-reset_all_guest_tokens"]').trigger('click')
    await flushPromises()
    expect(mockPost).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('shows field descriptions from config schema', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const descriptions = wrapper.findAll('.field-description')
    expect(descriptions.length).toBeGreaterThan(0)
    expect(descriptions[0].text()).toBe('Greeting message')
  })
})
