import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

import RoutingRules from '@/views/RoutingRules.vue'

// S120 T8 — RoutingRules.vue becomes a tabbed shell (mirroring
// TaxAndCountriesSettings.vue). The child tabs own their own store wiring, so
// we stub them here and assert only the shell behaviour: both tabs present,
// "Rules" default, switching to "Blocked countries".
function mountShell() {
  return mount(RoutingRules, {
    global: {
      stubs: {
        RoutingRulesTab: { template: '<div data-testid="rules-tab-content" />' },
        RoutingBlockedCountries: { template: '<div data-testid="blocked-tab-content" />' },
      },
    },
  })
}

describe('RoutingRules.vue tab shell (S120 T8)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders both tab buttons', () => {
    const wrapper = mountShell()
    expect(wrapper.find('[data-testid="subtab-rules"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="subtab-blocked-countries"]').exists()).toBe(true)
  })

  it('shows the Rules tab by default', () => {
    const wrapper = mountShell()
    expect(wrapper.find('[data-testid="rules-tab-content"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="blocked-tab-content"]').exists()).toBe(false)
  })

  it('marks the Rules tab active by default', () => {
    const wrapper = mountShell()
    expect(wrapper.find('[data-testid="subtab-rules"]').classes()).toContain('active')
    expect(wrapper.find('[data-testid="subtab-blocked-countries"]').classes()).not.toContain('active')
  })

  it('switches to the Blocked countries tab on click', async () => {
    const wrapper = mountShell()
    await wrapper.find('[data-testid="subtab-blocked-countries"]').trigger('click')
    expect(wrapper.find('[data-testid="blocked-tab-content"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rules-tab-content"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="subtab-blocked-countries"]').classes()).toContain('active')
  })
})
