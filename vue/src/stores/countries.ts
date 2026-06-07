import { defineStore } from 'pinia';
import { api } from '../api';

export interface Country {
  id: string;
  code: string;
  name: string;
  is_enabled: boolean;
  position: number;
  created_at: string | null;
  updated_at: string | null;
}

export const useCountriesStore = defineStore('countries', {
  state: () => ({
    countries: [] as Country[],
    enabledCountries: [] as Country[],
    disabledCountries: [] as Country[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    sortedEnabled: (state) => [...state.enabledCountries].sort((a, b) => a.position - b.position),
    sortedDisabled: (state) => [...state.disabledCountries].sort((a, b) => a.name.localeCompare(b.name)),
  },

  actions: {
    async fetchAllCountries(): Promise<Country[]> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get('/admin/countries') as { countries: Country[] };
        this.countries = response.countries;
        this.enabledCountries = response.countries.filter(c => c.is_enabled);
        this.disabledCountries = response.countries.filter(c => !c.is_enabled);
        return response.countries;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch countries';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchEnabledCountries(): Promise<Country[]> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get('/admin/countries/enabled') as { countries: Country[] };
        this.enabledCountries = response.countries;
        return response.countries;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch enabled countries';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchDisabledCountries(): Promise<Country[]> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get('/admin/countries/disabled') as { countries: Country[] };
        this.disabledCountries = response.countries;
        return response.countries;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch disabled countries';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async enableCountry(code: string): Promise<Country> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post(`/admin/countries/${code}/enable`) as Country;
        // Refresh lists
        await this.fetchAllCountries();
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to enable country';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async disableCountry(code: string): Promise<Country> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post(`/admin/countries/${code}/disable`) as Country;
        // Refresh lists
        await this.fetchAllCountries();
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to disable country';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async reorderCountries(codes: string[]): Promise<Country[]> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.put('/admin/countries/reorder', { codes }) as { countries: Country[] };
        this.enabledCountries = response.countries;
        return response.countries;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to reorder countries';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Optimistic UI update for drag-and-drop
    updateEnabledOrder(countries: Country[]): void {
      this.enabledCountries = countries;
    },

    reset() {
      this.countries = [];
      this.enabledCountries = [];
      this.disabledCountries = [];
      this.error = null;
      this.loading = false;
    },
  },
});
