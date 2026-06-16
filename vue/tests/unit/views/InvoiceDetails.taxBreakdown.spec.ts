/**
 * S85.4 gap #1 (fe-admin) — InvoiceDetails renders real per-rate tax lines
 * aggregated from the persisted line-item ``tax_breakdown`` (e.g. "VAT 19%").
 * The FE does NO tax math: it only sums the already-computed per-rate amounts
 * for display and echoes the persisted net/tax/gross totals. Falls back to the
 * single aggregate tax line for legacy invoices with no per-line breakdown.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vue-i18n', () => ({
  // Interpolate so <PriceBreakdown>'s ``price.taxLine`` label surfaces the
  // per-rate name (falling back to code) and rate (mirrors the real i18n; the
  // view itself does no math).
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${params.name ?? params.code ?? ''} ${params.rate ?? ''}` : key,
  }),
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

describe('InvoiceDetails — per-rate tax breakdown (S85.4 gap #1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockInvoice = null;
  });

  it('renders one tax line per rate from line-item tax_breakdown', async () => {
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
      line_items: [
        {
          type: 'subscription',
          description: 'Pro',
          quantity: 1,
          unit_price: '119.00',
          total_price: '119.00',
          net_amount: '100.00',
          tax_amount: '19.00',
          tax_breakdown: [{ code: 'VAT', name: 'VAT Germany', rate: 19, amount: 19.0 }],
        },
      ],
    };
    mockFetchInvoice.mockResolvedValue(undefined);

    const wrapper = mountView();
    await flushPromises();

    const taxLines = wrapper.findAll('[data-testid="price-breakdown-tax-line"]');
    expect(taxLines).toHaveLength(1);
    // The persisted human-readable name is carried through to the label.
    expect(taxLines[0].text()).toContain('VAT Germany');
    expect(taxLines[0].text()).toContain('19');
    expect(wrapper.get('[data-testid="price-breakdown-gross"]').text()).toContain('119');
  });

  it('aggregates the same rate across multiple lines into one tax line', async () => {
    mockInvoice = {
      id: 'inv-1',
      invoice_number: 'INV-001',
      status: 'PAID',
      amount: 238,
      subtotal: 200,
      tax_amount: 38,
      total_amount: 238,
      currency: 'EUR',
      created_at: '2026-01-01',
      user_email: 'test@example.com',
      user_name: 'Test User',
      line_items: [
        {
          type: 'subscription',
          description: 'Pro',
          quantity: 1,
          unit_price: '119.00',
          total_price: '119.00',
          tax_breakdown: [{ code: 'VAT', rate: 19, amount: 19.0 }],
        },
        {
          type: 'add_on',
          description: 'Extra',
          quantity: 1,
          unit_price: '119.00',
          total_price: '119.00',
          tax_breakdown: [{ code: 'VAT', rate: 19, amount: 19.0 }],
        },
      ],
    };
    mockFetchInvoice.mockResolvedValue(undefined);

    const wrapper = mountView();
    await flushPromises();

    const taxLines = wrapper.findAll('[data-testid="price-breakdown-tax-line"]');
    expect(taxLines).toHaveLength(1);
    expect(taxLines[0].text()).toContain('38');
  });

  it('reconciles a discounted booking invoice (resource + negative-tax discount line)', async () => {
    // S96.5: booking applies D-DiscountTax — the discount line carries a
    // NEGATIVE per-rate tax_breakdown so the aggregated per-rate tax matches the
    // post-discount invoice.tax_amount and net + tax == gross.
    mockInvoice = {
      id: 'inv-1',
      invoice_number: 'INV-BK-1',
      status: 'PAID',
      amount: 107.1,
      subtotal: 90,
      tax_amount: 17.1,
      total_amount: 107.1,
      currency: 'EUR',
      created_at: '2026-01-01',
      user_email: 'test@example.com',
      user_name: 'Test User',
      line_items: [
        {
          type: 'booking',
          description: 'Room — 1 night',
          quantity: 1,
          unit_price: '119.00',
          total_price: '119.00',
          net_amount: '100.00',
          tax_amount: '19.00',
          tax_breakdown: [{ code: 'VAT', name: 'VAT Germany', rate: 19, amount: 19.0 }],
        },
        {
          type: 'custom',
          description: 'Discount',
          quantity: 1,
          unit_price: '-11.90',
          total_price: '-11.90',
          net_amount: '-10.00',
          tax_amount: '-1.90',
          tax_breakdown: [{ code: 'VAT', name: 'VAT Germany', rate: 19, amount: -1.9 }],
        },
      ],
    };
    mockFetchInvoice.mockResolvedValue(undefined);

    const wrapper = mountView();
    await flushPromises();

    const taxLines = wrapper.findAll('[data-testid="price-breakdown-tax-line"]');
    expect(taxLines).toHaveLength(1);
    // 19.00 + (-1.90) = 17.10 — reconciling 90 + 17.10 = 107.10.
    expect(taxLines[0].text()).toContain('17.1');
    expect(wrapper.get('[data-testid="price-breakdown-gross"]').text()).toContain('107.1');
  });

  it('falls back to the aggregate tax line when no per-line breakdown exists', async () => {
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
      line_items: [
        {
          type: 'subscription',
          description: 'Legacy',
          quantity: 1,
          unit_price: '119.00',
          total_price: '119.00',
        },
      ],
    };
    mockFetchInvoice.mockResolvedValue(undefined);

    const wrapper = mountView();
    await flushPromises();

    const taxLines = wrapper.findAll('[data-testid="price-breakdown-tax-line"]');
    expect(taxLines).toHaveLength(1);
    expect(taxLines[0].text()).toContain('19');
    // No redundant aggregate Σtax row (Net + per-rate + Gross only).
    expect(wrapper.find('[data-testid="price-breakdown-tax-total"]').exists()).toBe(false);
  });
});
