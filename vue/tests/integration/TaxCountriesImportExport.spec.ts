/**
 * S72.2 — Import/Export controls embedded on the Taxes & Countries tabs.
 *
 * TaxesTab renders ONE `ImportExportControls` scoped to `taxes` (Tax Classes
 * were flattened into a `tax_class` string, so the `tax_classes` entity is
 * gone); CountriesTab renders one scoped to `countries`. Each control exposes
 * the manifest's `supported_formats` (json + csv) and routes its export/import
 * through the shared data-exchange endpoints the Import/Export page uses
 * (`/admin/data-exchange/<entity>/{export,import}`).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { defineComponent, ref } from 'vue';
import { createI18n } from 'vue-i18n';
import TaxesTab from '@/views/tax-countries/TaxesTab.vue';
import CountriesTab from '@/views/tax-countries/CountriesTab.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import en from '@/i18n/locales/en.json';

vi.mock('@/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn(),
}));

type Capability = {
  can_export: boolean;
  can_import: boolean;
  can_export_pii: boolean;
  supported_formats: string[];
};

const capabilities = ref<Record<string, Capability>>({});
const loadManifest = vi.fn().mockResolvedValue(undefined);

vi.mock('@/composables/useDataExchangeManifest', () => ({
  useDataExchangeManifest: () => ({
    load: loadManifest,
    capabilitiesFor: (key: string): Capability =>
      capabilities.value[key] ?? {
        can_export: false,
        can_import: false,
        can_export_pii: false,
        supported_formats: ['json'],
      },
  }),
}));

const ControlsStub = defineComponent({
  name: 'ImportExportControls',
  props: [
    'api',
    'entityKey',
    'selectedIds',
    'filterState',
    'canExport',
    'canImport',
    'canExportPii',
    'isSuperadmin',
    'supportedFormats',
    'allowExportAll',
    'allowExportSelected',
    'allowImport',
  ],
  emits: ['refresh'],
  template: '<div data-testid="iec-stub" :data-entity="entityKey" />',
});

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

function withCapabilities(entries: Record<string, Capability>): void {
  capabilities.value = entries;
}

function seedAuth(): void {
  configureAuthStore({
    storageKey: 'test_token',
    apiClient: {
      post: async () => ({}),
      get: async () => ({}),
      setToken: () => {},
      clearToken: () => {},
    } as never,
  });
  useAuthStore().$patch({
    user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
    token: 'test-token',
  });
}

function mountTab(component: unknown, stubControls = true) {
  return mount(component as never, {
    global: {
      plugins: [i18n],
      stubs: stubControls ? { ImportExportControls: ControlsStub } : {},
    },
  });
}

describe('S72.2 — Taxes & Countries import/export controls', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    seedAuth();
    vi.clearAllMocks();
    capabilities.value = {};
    vi.mocked(api.get).mockResolvedValue({});
  });

  describe('TaxesTab', () => {
    beforeEach(() => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.startsWith('/admin/tax/rates')) return Promise.resolve({ rates: [] });
        return Promise.resolve({});
      });
    });

    it('renders exactly one control scoped to taxes (json + csv)', async () => {
      withCapabilities({
        taxes: { can_export: true, can_import: true, can_export_pii: false, supported_formats: ['json', 'csv'] },
      });
      const wrapper = mountTab(TaxesTab);
      await flushPromises();

      const controls = wrapper.findAllComponents(ControlsStub);
      const entityKeys = controls.map((control) => control.props('entityKey'));
      expect(entityKeys).toEqual(['taxes']);
      expect(entityKeys).not.toContain('tax_classes');

      const taxesControl = controls.find((control) => control.props('entityKey') === 'taxes');
      expect(taxesControl?.props('supportedFormats')).toEqual(['json', 'csv']);
    });

    it('hides the taxes control when the manifest grants no capability', async () => {
      withCapabilities({
        taxes: { can_export: false, can_import: false, can_export_pii: false, supported_formats: ['json'] },
      });
      const wrapper = mountTab(TaxesTab);
      await flushPromises();

      const entityKeys = wrapper
        .findAllComponents(ControlsStub)
        .map((control) => control.props('entityKey'));
      expect(entityKeys).not.toContain('taxes');
      expect(entityKeys).not.toContain('tax_classes');
    });

    it('export routes through the shared data-exchange endpoint for taxes', async () => {
      withCapabilities({
        taxes: { can_export: true, can_import: false, can_export_pii: false, supported_formats: ['json', 'csv'] },
      });
      vi.mocked(api.post).mockResolvedValue(new Blob(['[]']));
      const wrapper = mountTab(TaxesTab, false);
      await flushPromises();

      await wrapper.find('[data-test="export-all"]').trigger('click');
      await flushPromises();

      expect(api.post).toHaveBeenCalledWith(
        '/admin/data-exchange/taxes/export',
        expect.objectContaining({ all: true }),
        expect.objectContaining({ responseType: 'blob' }),
      );
    });
  });

  describe('CountriesTab', () => {
    beforeEach(() => {
      vi.mocked(api.get).mockResolvedValue({ countries: [] });
    });

    it('renders a control scoped to countries (json + csv)', async () => {
      withCapabilities({
        countries: { can_export: true, can_import: true, can_export_pii: false, supported_formats: ['json', 'csv'] },
      });
      const wrapper = mountTab(CountriesTab);
      await flushPromises();

      const control = wrapper.findComponent(ControlsStub);
      expect(control.exists()).toBe(true);
      expect(control.props('entityKey')).toBe('countries');
      expect(control.props('supportedFormats')).toEqual(['json', 'csv']);
    });

    it('export routes through the shared data-exchange endpoint for countries', async () => {
      withCapabilities({
        countries: { can_export: true, can_import: false, can_export_pii: false, supported_formats: ['json', 'csv'] },
      });
      vi.mocked(api.post).mockResolvedValue(new Blob(['[]']));
      const wrapper = mountTab(CountriesTab, false);
      await flushPromises();

      await wrapper.find('[data-test="export-all"]').trigger('click');
      await flushPromises();

      expect(api.post).toHaveBeenCalledWith(
        '/admin/data-exchange/countries/export',
        expect.objectContaining({ all: true }),
        expect.objectContaining({ responseType: 'blob' }),
      );
    });

    it('hides the control when the manifest grants no countries capability', async () => {
      withCapabilities({
        countries: { can_export: false, can_import: false, can_export_pii: false, supported_formats: ['json'] },
      });
      const wrapper = mountTab(CountriesTab);
      await flushPromises();

      expect(wrapper.findComponent(ControlsStub).exists()).toBe(false);
    });
  });
});
