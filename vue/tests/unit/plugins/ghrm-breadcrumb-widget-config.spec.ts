import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../../../../plugins/ghrm-admin/src/api/ghrmWidgetApi', () => ({
  ghrmWidgetApi: {
    getWidgets: vi.fn(),
    updateWidget: vi.fn(),
  },
}))

// Stub child components that are not under test
vi.mock('../../../../plugins/ghrm-admin/src/components/GhrmBreadcrumbPreview.vue', () => ({
  default: { template: '<div data-testid="preview-stub" />' },
}))

import GhrmBreadcrumbWidgetConfig from '../../../../plugins/ghrm-admin/src/components/GhrmBreadcrumbWidgetConfig.vue'
import { ghrmWidgetApi } from '../../../../plugins/ghrm-admin/src/api/ghrmWidgetApi'
const mockUpdateWidget = vi.mocked(ghrmWidgetApi.updateWidget)

const defaultConfig = {
  id: 'catalogue',
  separator: '/',
  root_name: 'Home',
  root_slug: '/',
  show_category: true,
  max_label_length: 40,
  css: '',
}

function mountConfig(config = defaultConfig) {
  return mount(GhrmBreadcrumbWidgetConfig, {
    props: { widgetId: config.id, initialConfig: config },
    global: { stubs: { RouterLink: true } },
  })
}

describe('GhrmBreadcrumbWidgetConfig — tabs', () => {
  it('renders three tabs: General, CSS, Preview', () => {
    const w = mountConfig()
    const tabs = w.findAll('.ghrm-widget-config__tab')
    const labels = tabs.map((t) => t.text())
    expect(labels).toContain('General')
    expect(labels).toContain('CSS')
    expect(labels).toContain('Preview')
  })

  it('shows General tab by default', () => {
    const w = mountConfig()
    expect(w.find('[data-testid="separator-input"]').exists()).toBe(true)
  })

  it('switches to CSS tab on click', async () => {
    const w = mountConfig()
    const cssTab = w.findAll('.ghrm-widget-config__tab').find((t) => t.text() === 'CSS')!
    await cssTab.trigger('click')
    expect(w.find('[data-testid="css-textarea"]').exists()).toBe(true)
  })

  it('switches to Preview tab on click', async () => {
    const w = mountConfig()
    const previewTab = w.findAll('.ghrm-widget-config__tab').find((t) => t.text() === 'Preview')!
    await previewTab.trigger('click')
    expect(w.find('[data-testid="preview-stub"]').exists()).toBe(true)
  })
})

describe('GhrmBreadcrumbWidgetConfig — General tab fields', () => {
  it('displays initial separator value', () => {
    const w = mountConfig()
    const input = w.find<HTMLInputElement>('[data-testid="separator-input"]')
    expect(input.element.value).toBe('/')
  })

  it('displays initial root_name', () => {
    const w = mountConfig({ ...defaultConfig, root_name: 'Start' })
    const input = w.find<HTMLInputElement>('[data-testid="root-name-input"]')
    expect(input.element.value).toBe('Start')
  })

  it('displays show_category checkbox state', () => {
    const w = mountConfig({ ...defaultConfig, show_category: false })
    const cb = w.find<HTMLInputElement>('[data-testid="show-category-checkbox"]')
    expect(cb.element.checked).toBe(false)
  })
})

describe('GhrmBreadcrumbWidgetConfig — save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updateWidget with widget id and draft on save', async () => {
    mockUpdateWidget.mockResolvedValue({ ...defaultConfig, separator: '>' })
    const w = mountConfig()
    const input = w.find<HTMLInputElement>('[data-testid="separator-input"]')
    await input.setValue('>')
    await w.find('[data-testid="save-btn"]').trigger('click')
    await flushPromises()
    expect(mockUpdateWidget).toHaveBeenCalledWith('catalogue', expect.objectContaining({ separator: '>' }))
  })

  it('shows success message after save', async () => {
    mockUpdateWidget.mockResolvedValue(defaultConfig)
    const w = mountConfig()
    await w.find('[data-testid="save-btn"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="save-ok"]').exists()).toBe(true)
  })

  it('shows error message when save fails', async () => {
    mockUpdateWidget.mockRejectedValue(new Error('Network error'))
    const w = mountConfig()
    await w.find('[data-testid="save-btn"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="save-error"]').text()).toContain('Network error')
  })

  it('emits saved event with updated config', async () => {
    const updated = { ...defaultConfig, separator: '›' }
    mockUpdateWidget.mockResolvedValue(updated)
    const w = mountConfig()
    await w.find('[data-testid="save-btn"]').trigger('click')
    await flushPromises()
    expect(w.emitted('saved')?.[0]?.[0]).toEqual(updated)
  })
})

describe('GhrmBreadcrumbWidgetConfig — reset', () => {
  it('restores draft to initial config on reset', async () => {
    const w = mountConfig()
    const input = w.find<HTMLInputElement>('[data-testid="separator-input"]')
    await input.setValue('>')
    expect(input.element.value).toBe('>')
    await w.find('[data-testid="reset-btn"]').trigger('click')
    expect(input.element.value).toBe('/')
  })
})
