import { defineStore } from 'pinia';
import { api } from '../api';

/**
 * Geo-block config (S120). The `allowed_country_*` fields are DERIVED read-only
 * from core `vbwd_country.is_enabled` on the backend — they are returned by GET
 * but never sent on PUT (DRY: the allowed list is managed on the
 * tax-and-countries screen, not duplicated here).
 */
export interface GeoBlockConfig {
  is_enabled: boolean;
  bypass_query: string;
  bypass_cookie_ttl_days: number;
  blocked_target_slug: string;
  block_unknown_country: boolean;
  allowed_country_codes: string[];
  allowed_country_count: number;
}

export type GeoBlockPayload = Pick<
  GeoBlockConfig,
  'is_enabled' | 'bypass_query' | 'bypass_cookie_ttl_days' | 'blocked_target_slug' | 'block_unknown_country'
>;

const GEO_BLOCK_ENDPOINT = '/admin/cms/geo-block';

function defaultConfig(): GeoBlockConfig {
  return {
    is_enabled: false,
    bypass_query: '',
    bypass_cookie_ttl_days: 30,
    blocked_target_slug: '/locked',
    block_unknown_country: false,
    allowed_country_codes: [],
    allowed_country_count: 0,
  };
}

export const useGeoBlockStore = defineStore('geoBlock', {
  state: () => ({
    config: defaultConfig(),
    loading: false,
    error: '' as string,
  }),

  actions: {
    async fetchConfig(): Promise<void> {
      this.loading = true;
      this.error = '';
      try {
        const data = await api.get(GEO_BLOCK_ENDPOINT) as GeoBlockConfig;
        this.config = data;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to load geo-block config';
      } finally {
        this.loading = false;
      }
    },

    async saveConfig(payload: GeoBlockPayload): Promise<GeoBlockConfig> {
      this.error = '';
      try {
        const data = await api.put(GEO_BLOCK_ENDPOINT, payload) as GeoBlockConfig;
        this.config = data;
        return data;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to save geo-block config';
        throw err;
      }
    },
  },
});
