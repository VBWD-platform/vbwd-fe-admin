import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/stores/routingRules', () => ({
  useRoutingRulesStore: () => ({
    rules: [],
    loading: false,
    error: '',
    fetchRules: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    reloadNginx: vi.fn(),
  }),
}))

import RoutingRuleForm from '@/views/RoutingRuleForm.vue'

function mountForm(props: Record<string, unknown> = {}) {
  return mount(RoutingRuleForm, {
    props,
    global: { stubs: { RouterLink: true } },
  })
}

describe('RoutingRuleForm — match_value visibility', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('hides match_value when match_type is "default"', async () => {
    const w = mountForm()
    const select = w.find('[data-testid="rule-match-type"]')
    await select.setValue('default')
    expect(w.find('[data-testid="rule-match-value"]').exists()).toBe(false)
  })

  it('shows match_value when match_type is "language"', async () => {
    const w = mountForm()
    const select = w.find('[data-testid="rule-match-type"]')
    await select.setValue('language')
    expect(w.find('[data-testid="rule-match-value"]').exists()).toBe(true)
  })

  it('shows match_value when match_type is "ip_range"', async () => {
    const w = mountForm()
    await w.find('[data-testid="rule-match-type"]').setValue('ip_range')
    expect(w.find('[data-testid="rule-match-value"]').exists()).toBe(true)
  })
})

describe('RoutingRuleForm — submit emits saved', () => {
  it('emits saved with form data on submit', async () => {
    const w = mountForm()
    await w.find('[data-testid="rule-name"]').setValue('Test Rule')
    await w.find('[data-testid="rule-target-slug"]').setValue('de/home')
    await w.find('form').trigger('submit')
    const emitted = w.emitted('saved')
    expect(emitted).toBeTruthy()
    expect((emitted?.[0]?.[0] as Record<string, unknown>).name).toBe('Test Rule')
  })
})

describe('RoutingRuleForm — edit mode', () => {
  it('shows "Update" button in edit mode', () => {
    const rule = {
      id: 'rule-1', name: 'Edit me', is_active: true, priority: 0,
      match_type: 'default', match_value: null, target_slug: 'home',
      redirect_code: 302, is_rewrite: false, layer: 'middleware',
      created_at: null, updated_at: null,
    }
    const w = mountForm({ rule })
    expect(w.find('[data-testid="form-submit"]').text()).toContain('Update')
  })

  it('pre-fills name in edit mode', () => {
    const rule = {
      id: 'rule-1', name: 'My Rule', is_active: true, priority: 5,
      match_type: 'language', match_value: 'de', target_slug: 'de/home',
      redirect_code: 301, is_rewrite: false, layer: 'nginx',
      created_at: null, updated_at: null,
    }
    const w = mountForm({ rule })
    const input = w.find<HTMLInputElement>('[data-testid="rule-name"]')
    expect(input.element.value).toBe('My Rule')
  })
})
