import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// S120 T9 — RoutingBlockedCountries drives the geoBlock store. We mock the
// store so the component test needs no live backend (backend is built in
// parallel against the same FROZEN contract).
const fetchConfig = vi.fn()
const saveConfig = vi.fn()

const storeState: {
  config: {
    is_enabled: boolean
    bypass_query: string
    bypass_cookie_ttl_days: number
    blocked_target_slug: string
    block_unknown_country: boolean
    allowed_country_codes: string[]
    allowed_country_count: number
  }
  loading: boolean
  error: string
} = {
  config: {
    is_enabled: false,
    bypass_query: '',
    bypass_cookie_ttl_days: 30,
    blocked_target_slug: '/locked',
    block_unknown_country: false,
    allowed_country_codes: [],
    allowed_country_count: 0,
  },
  loading: false,
  error: '',
}

vi.mock('@/stores/geoBlock', () => ({
  useGeoBlockStore: () => ({
    get config() {
      return storeState.config
    },
    get loading() {
      return storeState.loading
    },
    get error() {
      return storeState.error
    },
    fetchConfig,
    saveConfig,
  }),
}))

import RoutingBlockedCountries from '@/views/RoutingBlockedCountries.vue'

function mountTab() {
  return mount(RoutingBlockedCountries, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

async function mountReady() {
  const wrapper = mountTab()
  await flushPromises()
  return wrapper
}

describe('RoutingBlockedCountries.vue (S120 T9)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    storeState.config = {
      is_enabled: true,
      bypass_query: 'allowme=yes',
      bypass_cookie_ttl_days: 30,
      blocked_target_slug: '/locked',
      block_unknown_country: false,
      allowed_country_codes: ['DE', 'AT', 'CH'],
      allowed_country_count: 3,
    }
    storeState.loading = false
    storeState.error = ''
  })

  it('fetches the config on mount', async () => {
    await mountReady()
    expect(fetchConfig).toHaveBeenCalled()
  })

  it('renders every required control', async () => {
    const wrapper = await mountReady()
    expect(wrapper.find('[data-testid="geoblock-enabled"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="geoblock-bypass-query"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="geoblock-cookie-ttl"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="geoblock-target-slug"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="geoblock-block-unknown"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="geoblock-save"]').exists()).toBe(true)
  })

  it('links to the tax-and-countries screen where the allowed list is managed', async () => {
    const wrapper = await mountReady()
    const link = wrapper.findComponent(RouterLinkStub)
    expect(link.props('to')).toBe('/admin/settings/tax-and-countries')
    expect(link.text()).toContain('See allowed countries')
  })

  it('shows the live allowed-country count from the payload', async () => {
    const wrapper = await mountReady()
    expect(wrapper.find('[data-testid="geoblock-allowed-count"]').text()).toContain('3')
  })

  it('binds the enabled checkbox to the config', async () => {
    const wrapper = await mountReady()
    const checkbox = wrapper.find('[data-testid="geoblock-enabled"]')
      .element as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('seeds the bypass query input from the config', async () => {
    const wrapper = await mountReady()
    const input = wrapper.find('[data-testid="geoblock-bypass-query"]')
      .element as HTMLInputElement
    expect(input.value).toBe('allowme=yes')
  })

  it('has the allowme=yes placeholder on the bypass query input', async () => {
    const wrapper = await mountReady()
    const input = wrapper.find('[data-testid="geoblock-bypass-query"]')
    expect(input.attributes('placeholder')).toBe('allowme=yes')
  })

  it('saves the current field values as the five-field payload', async () => {
    saveConfig.mockResolvedValue(undefined)
    const wrapper = await mountReady()

    await wrapper.find('[data-testid="geoblock-bypass-query"]').setValue('letmein=1')
    await wrapper.find('[data-testid="geoblock-cookie-ttl"]').setValue('14')
    await wrapper.find('[data-testid="geoblock-target-slug"]').setValue('/blocked')
    await wrapper.find('[data-testid="geoblock-save"]').trigger('click')
    await flushPromises()

    expect(saveConfig).toHaveBeenCalledWith({
      is_enabled: true,
      bypass_query: 'letmein=1',
      bypass_cookie_ttl_days: 14,
      blocked_target_slug: '/blocked',
      block_unknown_country: false,
    })
  })

  it('allows saving with an empty bypass query (bypass simply off)', async () => {
    saveConfig.mockResolvedValue(undefined)
    const wrapper = await mountReady()

    await wrapper.find('[data-testid="geoblock-bypass-query"]').setValue('')
    await wrapper.find('[data-testid="geoblock-save"]').trigger('click')
    await flushPromises()

    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ bypass_query: '' }),
    )
  })

  it('surfaces a save error', async () => {
    saveConfig.mockRejectedValue(new Error('Invalid bypass query'))
    const wrapper = await mountReady()

    await wrapper.find('[data-testid="geoblock-save"]').trigger('click')
    await flushPromises()

    const message = wrapper.find('[data-testid="geoblock-error"]')
    expect(message.exists()).toBe(true)
    expect(message.text()).toContain('Invalid bypass query')
  })
})
