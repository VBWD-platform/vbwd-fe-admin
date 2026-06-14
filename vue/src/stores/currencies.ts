import { defineStore } from 'pinia';
import { api } from '../api';

/**
 * Currency catalog row as returned by `GET /api/v1/admin/currencies` (S84).
 *
 * `exchange_rate` is the number of units of THIS currency per one unit of the
 * DEFAULT currency (the default's own rate is `1.0`). `is_active` / `is_default`
 * are DERIVED by the backend from the core settings JSON (the single source of
 * truth for the active set + default), not from table columns.
 */
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  decimal_places: number;
  is_active: boolean;
  is_default: boolean;
}

interface CurrenciesResponse {
  currencies: Currency[];
}

interface CurrencyResponse {
  currency: Currency;
}

/** Payload for `POST /api/v1/admin/currencies` (S84 — add a new currency). */
export interface CreateCurrencyPayload {
  code: string;
  name: string;
  symbol: string;
  decimal_places?: number;
  exchange_rate?: number;
}

export const useCurrenciesStore = defineStore('currencies', {
  state: () => ({
    currencies: [] as Currency[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    /** Active currencies, default-first then code (mirrors the backend order). */
    active: (state): Currency[] => state.currencies.filter((currency) => currency.is_active),
    /** Inactive currencies (the "available" panel). */
    available: (state): Currency[] => state.currencies.filter((currency) => !currency.is_active),
    /** The default currency (prices are stored in this one), or null before load. */
    defaultCurrency: (state): Currency | null =>
      state.currencies.find((currency) => currency.is_default) ?? null,
  },

  actions: {
    async fetchCurrencies(): Promise<Currency[]> {
      this.loading = true;
      this.error = null;
      try {
        const response = (await api.get('/admin/currencies')) as CurrenciesResponse;
        this.currencies = response.currencies;
        return response.currencies;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch currencies';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async activate(code: string): Promise<Currency[]> {
      const response = (await api.post(`/admin/currencies/${code}/activate`)) as CurrenciesResponse;
      this.currencies = response.currencies;
      return response.currencies;
    },

    async deactivate(code: string): Promise<Currency[]> {
      const response = (await api.post(
        `/admin/currencies/${code}/deactivate`,
      )) as CurrenciesResponse;
      this.currencies = response.currencies;
      return response.currencies;
    },

    async setDefault(code: string): Promise<Currency[]> {
      const response = (await api.post(
        `/admin/currencies/${code}/set-default`,
      )) as CurrenciesResponse;
      this.currencies = response.currencies;
      return response.currencies;
    },

    async updateRate(code: string, exchangeRate: number): Promise<Currency> {
      const response = (await api.put(`/admin/currencies/${code}/rate`, {
        exchange_rate: exchangeRate,
      })) as CurrencyResponse;
      const updated = response.currency;
      const index = this.currencies.findIndex((currency) => currency.code === updated.code);
      if (index !== -1) {
        this.currencies.splice(index, 1, updated);
      }
      return updated;
    },

    async createCurrency(payload: CreateCurrencyPayload): Promise<Currency> {
      this.error = null;
      let created: Currency;
      try {
        const response = (await api.post('/admin/currencies', payload)) as CurrencyResponse;
        created = response.currency;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to create currency';
        throw error;
      }
      await this.fetchCurrencies();
      return created;
    },

    async deleteCurrency(code: string): Promise<Currency[]> {
      this.error = null;
      try {
        await api.delete(`/admin/currencies/${code}`);
      } catch (error) {
        this.error = (error as Error).message || 'Failed to delete currency';
        throw error;
      }
      return this.fetchCurrencies();
    },

    reset(): void {
      this.currencies = [];
      this.error = null;
      this.loading = false;
    },
  },
});
