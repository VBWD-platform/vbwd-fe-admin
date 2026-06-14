/**
 * S77 — the admin invoice detail renders each line's FROZEN tags + custom
 * fields (snapshotted at issue time) via the fe-core TagChips +
 * CustomFieldsDisplay components, reading the `tags` / `custom_fields` keys
 * already on the line-item payload (no extra fetch, no live join).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Pinia } from 'pinia'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: { id: 'inv-1' } }),
  RouterLink: { template: '<a><slot /></a>', props: ['to'] },
}))

let mockInvoice: Record<string, unknown> | null = null
const mockFetchInvoice = vi.fn()

vi.mock('@/stores/invoices', () => ({
  useInvoicesStore: () => ({
    get selectedInvoice() { return mockInvoice },
    loading: false,
    error: null,
    fetchInvoice: mockFetchInvoice,
    resendInvoice: vi.fn(),
    voidInvoice: vi.fn(),
    markPaid: vi.fn(),
    refundInvoice: vi.fn(),
    duplicateInvoice: vi.fn(),
  }),
}))

import InvoiceDetails from '../../../src/views/InvoiceDetails.vue'

function mountView() {
  return mount(InvoiceDetails, {
    global: {
      stubs: { RouterLink: { template: '<a><slot /></a>', props: ['to'] } },
      mocks: { $t: (k: string) => k },
    },
  })
}

describe('InvoiceDetails — frozen line tags + custom fields (S77)', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    mockInvoice = null
  })

  it('renders TagChips + CustomFieldsDisplay from the line payload keys', async () => {
    mockInvoice = {
      id: 'inv-1',
      invoice_number: 'INV-001',
      status: 'PAID',
      amount: 29.99,
      currency: 'EUR',
      created_at: '2026-01-01',
      user_email: 'test@example.com',
      user_name: 'Test User',
      line_items: [
        {
          id: 'item-1',
          type: 'CUSTOM',
          description: 'Premium Widget',
          quantity: 1,
          unit_price: 29.99,
          amount: 29.99,
          tags: ['sale', 'bestseller'],
          custom_fields: { warranty: 24 },
        },
      ],
    }
    mockFetchInvoice.mockResolvedValue(undefined)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TagChips' }).exists()).toBe(true)
    expect(wrapper.text()).toContain('sale')
    expect(wrapper.text()).toContain('bestseller')
    expect(
      wrapper.find('[data-testid="custom-fields-display"]').exists(),
    ).toBe(true)
  })

  it('renders no tag/cf components when the line carries none', async () => {
    mockInvoice = {
      id: 'inv-2',
      invoice_number: 'INV-002',
      status: 'PAID',
      amount: 10,
      currency: 'EUR',
      created_at: '2026-01-01',
      user_email: 'test@example.com',
      user_name: 'Test User',
      line_items: [
        {
          id: 'item-2',
          type: 'CUSTOM',
          description: 'Plain Widget',
          quantity: 1,
          unit_price: 10,
          amount: 10,
          tags: [],
          custom_fields: {},
        },
      ],
    }
    mockFetchInvoice.mockResolvedValue(undefined)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TagChips' }).exists()).toBe(false)
    expect(
      wrapper.find('[data-testid="custom-fields-display"]').exists(),
    ).toBe(false)
  })
})
