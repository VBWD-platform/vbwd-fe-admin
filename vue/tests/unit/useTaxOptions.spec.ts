import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '@/api';
import { useTaxOptions, __resetTaxOptionsCache } from '@/composables/useTaxOptions';

vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const activeRate = {
  id: 'tax-1',
  code: 'VAT19',
  name: 'Standard VAT',
  rate: '19.00',
  is_active: true,
};
const inactiveRate = {
  id: 'tax-2',
  code: 'OLD',
  name: 'Retired tax',
  rate: '7.00',
  is_active: false,
};

describe('useTaxOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetTaxOptionsCache();
  });

  it('fetches active taxes from /admin/tax/rates and exposes DualListSelector options', async () => {
    vi.mocked(api.get).mockResolvedValue({ rates: [activeRate, inactiveRate] });

    const { taxOptions, loadTaxOptions } = useTaxOptions();
    await loadTaxOptions();

    expect(api.get).toHaveBeenCalledWith('/admin/tax/rates');
    // Inactive rates filtered out.
    expect(taxOptions.value).toHaveLength(1);
    expect(taxOptions.value[0]).toMatchObject({ value: 'tax-1' });
    // Label must mention both the name and the rate so admins can tell them apart.
    expect(taxOptions.value[0].label).toContain('Standard VAT');
    expect(taxOptions.value[0].label).toContain('19');
  });

  it('fetches only once and shares the cache across callers (DRY)', async () => {
    vi.mocked(api.get).mockResolvedValue({ rates: [activeRate] });

    const first = useTaxOptions();
    const second = useTaxOptions();
    await Promise.all([first.loadTaxOptions(), second.loadTaxOptions()]);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(first.taxOptions.value).toHaveLength(1);
    expect(second.taxOptions.value).toHaveLength(1);
  });

  it('tolerates a response without a rates key', async () => {
    vi.mocked(api.get).mockResolvedValue({ plan: { id: 'x' } });

    const { taxOptions, loadTaxOptions } = useTaxOptions();
    await loadTaxOptions();

    expect(taxOptions.value).toEqual([]);
  });
});
