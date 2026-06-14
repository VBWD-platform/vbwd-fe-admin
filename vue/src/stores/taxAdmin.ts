import { defineStore } from 'pinia';
import { api } from '../api';

export interface TaxRate {
  id: string;
  name: string;
  code: string;
  description: string;
  rate: string;
  country_code: string | null;
  region_code: string | null;
  tax_class?: string | null;
  is_active: boolean;
  is_inclusive: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const useTaxAdminStore = defineStore('taxAdmin', {
  state: () => ({
    rates: [] as TaxRate[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchRates(filters?: { country?: string; is_active?: boolean; tax_class?: string }): Promise<TaxRate[]> {
      this.loading = true;
      this.error = null;
      try {
        const params = new URLSearchParams();
        if (filters?.country) params.set('country', filters.country);
        if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active));
        if (filters?.tax_class) params.set('tax_class', filters.tax_class);
        const query = params.toString();
        const url = `/admin/tax/rates${query ? '?' + query : ''}`;
        const response = await api.get(url) as { rates: TaxRate[] };
        this.rates = response.rates;
        return response.rates;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch tax rates';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createRate(data: Partial<TaxRate>): Promise<TaxRate> {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/admin/tax/rates', data) as { rate: TaxRate };
        await this.fetchRates();
        return response.rate;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to create tax rate';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateRate(rateId: string, data: Partial<TaxRate>): Promise<TaxRate> {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.put(`/admin/tax/rates/${rateId}`, data) as { rate: TaxRate };
        await this.fetchRates();
        return response.rate;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to update tax rate';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteRate(rateId: string): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        await api.delete(`/admin/tax/rates/${rateId}`);
        await this.fetchRates();
      } catch (error) {
        this.error = (error as Error).message || 'Failed to delete tax rate';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.rates = [];
      this.error = null;
      this.loading = false;
    },
  },
});
