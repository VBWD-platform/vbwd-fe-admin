/**
 * S85.4 (fe-admin) — InvoiceDetails tax-disclosure block.
 *
 * The admin invoice detail must surface the persisted invoice-level tax
 * breakdown (net / Σtax / gross) built from ``subtotal`` / ``tax_amount`` /
 * ``total_amount`` straight off the invoice payload. It performs NO tax math —
 * the numbers are echoed from the persisted fields through <PriceBreakdown>.
 *
 * NOTE: per-rate tax lines are not yet available (only the invoice-level
 * ``tax_amount`` is persisted — S85.2 has not landed per-line tax), so a single
 * aggregate tax line is rendered when ``tax_amount > 0``.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: { id: 'inv-1' } }),
  RouterLink: { template: '<a><slot /></a>', props: ['to'] },
}));

const mockFetchInvoice = vi.fn();
let mockInvoice: Record<string, unknown> | null = null;

vi.mock('@/stores/invoices', () => ({
  useInvoicesStore: () => ({
    get selectedInvoice() {
      return mockInvoice;
    },
    loading: false,
    error: null,
    fetchInvoice: mockFetchInvoice,
    resendInvoice: vi.fn(),
    voidInvoice: vi.fn(),
    markPaid: vi.fn(),
    refundInvoice: vi.fn(),
    duplicateInvoice: vi.fn(),
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ hasPermission: () => true }),
}));

import InvoiceDetails from '@/views/InvoiceDetails.vue';

function mountView() {
  return mount(InvoiceDetails, {
    global: {
      stubs: { RouterLink: { template: '<a><slot /></a>', props: ['to'] } },
      mocks: { $t: (k: string) => k },
    },
  });
}

describe('InvoiceDetails — tax-disclosure breakdown', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockInvoice = null;
  });

  it('renders net / per-rate tax / gross from the persisted invoice fields', async () => {
    mockInvoice = {
      id: 'inv-1',
      invoice_number: 'INV-001',
      status: 'PAID',
      amount: 119,
      subtotal: 100,
      tax_amount: 19,
      total_amount: 119,
      currency: 'EUR',
      created_at: '2026-01-01',
      user_email: 'test@example.com',
      user_name: 'Test User',
      line_items: [],
    };
    mockFetchInvoice.mockResolvedValue(undefined);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('[data-testid="price-breakdown-net"]').text()).toContain('100');
    expect(wrapper.get('[data-testid="price-breakdown-tax-line"]').text()).toContain('19');
    expect(wrapper.get('[data-testid="price-breakdown-gross"]').text()).toContain('119');
    // No redundant aggregate Σtax row (Net + per-rate + Gross only).
    expect(wrapper.find('[data-testid="price-breakdown-tax-total"]').exists()).toBe(false);
  });

  it('renders no tax line and net == gross for a tax-free invoice', async () => {
    mockInvoice = {
      id: 'inv-2',
      invoice_number: 'INV-002',
      status: 'PAID',
      amount: 100,
      subtotal: 100,
      tax_amount: 0,
      total_amount: 100,
      currency: 'EUR',
      created_at: '2026-01-01',
      user_email: 'test@example.com',
      user_name: 'Test User',
      line_items: [],
    };
    mockFetchInvoice.mockResolvedValue(undefined);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('[data-testid="price-breakdown-tax-line"]')).toHaveLength(0);
    expect(wrapper.get('[data-testid="price-breakdown-net"]').text()).toContain('100');
    expect(wrapper.get('[data-testid="price-breakdown-gross"]').text()).toContain('100');
  });

  it('falls back to invoice.amount when subtotal/total_amount are absent (legacy payloads)', async () => {
    mockInvoice = {
      id: 'inv-3',
      invoice_number: 'INV-003',
      status: 'PAID',
      amount: 42,
      currency: 'EUR',
      created_at: '2026-01-01',
      user_email: 'test@example.com',
      user_name: 'Test User',
      line_items: [],
    };
    mockFetchInvoice.mockResolvedValue(undefined);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('[data-testid="price-breakdown-net"]').text()).toContain('42');
    expect(wrapper.get('[data-testid="price-breakdown-gross"]').text()).toContain('42');
    expect(wrapper.findAll('[data-testid="price-breakdown-tax-line"]')).toHaveLength(0);
  });
});
