import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCurrenciesStore } from '@/stores/currencies';
import { api } from '@/api';
import type { Currency } from '@/stores/currencies';

// S84 — the currencies store reuses the `api` singleton (no bespoke service),
// mirroring countries.ts / taxAdmin.ts. The backend contract is fixed:
//   GET    /admin/currencies                 -> { currencies: [...] }
//   POST   /admin/currencies/<code>/activate -> { currencies: [...] }
//   POST   /admin/currencies/<code>/deactivate
//   POST   /admin/currencies/<code>/set-default
//   PUT    /admin/currencies/<code>/rate     -> { currency: {...} }
vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

function makeCurrency(overrides: Partial<Currency>): Currency {
  return {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    exchange_rate: 1,
    decimal_places: 2,
    is_active: true,
    is_default: true,
    ...overrides,
  };
}

const CATALOG: Currency[] = [
  makeCurrency({ code: 'EUR', exchange_rate: 1, is_active: true, is_default: true }),
  makeCurrency({ code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 1.08, is_active: true, is_default: false }),
  makeCurrency({ code: 'GBP', name: 'Pound', symbol: '£', exchange_rate: 0.85, is_active: true, is_default: false }),
  makeCurrency({ code: 'JPY', name: 'Yen', symbol: '¥', exchange_rate: 160, is_active: false, is_default: false }),
];

describe('useCurrenciesStore (S84)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetchCurrencies() GETs /admin/currencies and stores the catalog', async () => {
    vi.mocked(api.get).mockResolvedValue({ currencies: CATALOG });
    const store = useCurrenciesStore();

    const result = await store.fetchCurrencies();

    expect(api.get).toHaveBeenCalledWith('/admin/currencies');
    expect(result).toHaveLength(4);
    expect(store.currencies).toHaveLength(4);
  });

  it('activate(code) POSTs /admin/currencies/<code>/activate', async () => {
    vi.mocked(api.post).mockResolvedValue({ currencies: CATALOG });
    const store = useCurrenciesStore();

    await store.activate('JPY');

    expect(api.post).toHaveBeenCalledWith('/admin/currencies/JPY/activate');
    expect(store.currencies).toHaveLength(4);
  });

  it('deactivate(code) POSTs /admin/currencies/<code>/deactivate', async () => {
    vi.mocked(api.post).mockResolvedValue({ currencies: CATALOG });
    const store = useCurrenciesStore();

    await store.deactivate('GBP');

    expect(api.post).toHaveBeenCalledWith('/admin/currencies/GBP/deactivate');
  });

  it('setDefault(code) POSTs /admin/currencies/<code>/set-default', async () => {
    vi.mocked(api.post).mockResolvedValue({ currencies: CATALOG });
    const store = useCurrenciesStore();

    await store.setDefault('USD');

    expect(api.post).toHaveBeenCalledWith('/admin/currencies/USD/set-default');
  });

  it('updateRate(code, rate) PUTs /admin/currencies/<code>/rate with the exchange_rate payload', async () => {
    const updated = makeCurrency({ code: 'GBP', name: 'Pound', symbol: '£', exchange_rate: 0.9, is_default: false });
    vi.mocked(api.put).mockResolvedValue({ currency: updated });
    const store = useCurrenciesStore();
    store.currencies = [...CATALOG];

    const result = await store.updateRate('GBP', 0.9);

    expect(api.put).toHaveBeenCalledWith('/admin/currencies/GBP/rate', { exchange_rate: 0.9 });
    expect(result.exchange_rate).toBe(0.9);
    expect(store.currencies.find((currency) => currency.code === 'GBP')?.exchange_rate).toBe(0.9);
  });

  it('getters split active / available and surface the default', () => {
    const store = useCurrenciesStore();
    store.currencies = [...CATALOG];

    expect(store.active.map((currency) => currency.code)).toEqual(['EUR', 'USD', 'GBP']);
    expect(store.available.map((currency) => currency.code)).toEqual(['JPY']);
    expect(store.defaultCurrency?.code).toBe('EUR');
  });

  it('createCurrency(payload) POSTs /admin/currencies then refetches the catalog', async () => {
    const created = makeCurrency({ code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', exchange_rate: 1.05, is_active: false, is_default: false });
    vi.mocked(api.post).mockResolvedValue({ currency: created });
    vi.mocked(api.get).mockResolvedValue({ currencies: [...CATALOG, created] });
    const store = useCurrenciesStore();

    const result = await store.createCurrency({
      code: 'CHF',
      name: 'Swiss Franc',
      symbol: 'Fr',
      decimal_places: 2,
      exchange_rate: 1.05,
    });

    expect(api.post).toHaveBeenCalledWith('/admin/currencies', {
      code: 'CHF',
      name: 'Swiss Franc',
      symbol: 'Fr',
      decimal_places: 2,
      exchange_rate: 1.05,
    });
    expect(api.get).toHaveBeenCalledWith('/admin/currencies');
    expect(result.code).toBe('CHF');
    expect(store.currencies.map((currency) => currency.code)).toContain('CHF');
  });

  it('createCurrency() surfaces a backend 400 error and does not refetch', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Currency code already exists'));
    const store = useCurrenciesStore();

    await expect(
      store.createCurrency({ code: 'EUR', name: 'Euro', symbol: '€' }),
    ).rejects.toThrow('Currency code already exists');
    expect(store.error).toBe('Currency code already exists');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('deleteCurrency(code) DELETEs /admin/currencies/<code> then refetches', async () => {
    const remaining = CATALOG.filter((currency) => currency.code !== 'JPY');
    vi.mocked(api.delete).mockResolvedValue({ currencies: remaining });
    vi.mocked(api.get).mockResolvedValue({ currencies: remaining });
    const store = useCurrenciesStore();
    store.currencies = [...CATALOG];

    await store.deleteCurrency('JPY');

    expect(api.delete).toHaveBeenCalledWith('/admin/currencies/JPY');
    expect(api.get).toHaveBeenCalledWith('/admin/currencies');
    expect(store.currencies.map((currency) => currency.code)).not.toContain('JPY');
  });

  it('deleteCurrency() surfaces a backend 400 error and does not refetch', async () => {
    vi.mocked(api.delete).mockRejectedValue(new Error('Cannot delete an active currency'));
    const store = useCurrenciesStore();

    await expect(store.deleteCurrency('USD')).rejects.toThrow('Cannot delete an active currency');
    expect(store.error).toBe('Cannot delete an active currency');
    expect(api.get).not.toHaveBeenCalled();
  });
});
