import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCountriesStore } from '@/stores/countries';
import { api } from '@/api';

vi.mock('@/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn()
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn()
}));

describe('countries store — export / import', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('exportCountries', () => {
    it('returns the VBWD-standard envelope from the export endpoint', async () => {
      const envelope = {
        vbwd_export: 'countries',
        version: 1,
        countries: [{ code: 'DE', name: 'Germany', is_enabled: true, position: 0 }]
      };
      vi.mocked(api.get).mockResolvedValue(envelope);

      const store = useCountriesStore();
      const result = await store.exportCountries();

      expect(api.get).toHaveBeenCalledWith('/admin/countries/export');
      expect(result).toEqual(envelope);
    });

    it('records an error when the export fails', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('boom'));

      const store = useCountriesStore();
      await expect(store.exportCountries()).rejects.toThrow('boom');
      expect(store.error).toBe('boom');
    });
  });

  describe('importCountries', () => {
    it('posts the payload and refreshes the catalog', async () => {
      const payload = { vbwd_export: 'countries', version: 1, countries: [] };
      vi.mocked(api.post).mockResolvedValue({ created: 2, updated: 3 });
      vi.mocked(api.get).mockResolvedValue({ countries: [] });

      const store = useCountriesStore();
      const result = await store.importCountries(payload);

      expect(api.post).toHaveBeenCalledWith('/admin/countries/import', payload);
      expect(result).toEqual({ created: 2, updated: 3 });
      // fetchAllCountries refresh hit the list endpoint.
      expect(api.get).toHaveBeenCalledWith('/admin/countries');
    });

    it('records an error when the import fails', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('bad file'));

      const store = useCountriesStore();
      await expect(store.importCountries({})).rejects.toThrow('bad file');
      expect(store.error).toBe('bad file');
    });
  });
});
