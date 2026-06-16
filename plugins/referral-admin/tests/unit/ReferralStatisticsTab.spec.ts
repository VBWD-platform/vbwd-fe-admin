import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { defineComponent, ref } from 'vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import ReferralStatisticsTab from '../../src/views/ReferralStatisticsTab.vue';
import en from '../../locales/en.json';

vi.mock('@/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const capabilities = ref<Record<string, unknown>>({});
const loadManifest = vi.fn().mockResolvedValue(undefined);

vi.mock('@/composables/useDataExchangeManifest', () => ({
  useDataExchangeManifest: () => ({
    load: loadManifest,
    capabilitiesFor: (key: string) =>
      capabilities.value[key] ?? {
        can_export: false,
        can_import: false,
        can_export_pii: false,
        supported_formats: ['json'],
      },
  }),
}));

const IecStub = defineComponent({
  name: 'ImportExportControls',
  props: ['api', 'entityKey', 'selectedIds', 'canExport', 'canImport', 'canExportPii', 'isSuperadmin', 'supportedFormats'],
  emits: ['refresh'],
  template: '<div data-testid="iec-stub" :data-entity="entityKey" />',
});

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en: { ...en, common: { loading: 'Loading' } } },
});

// One masked (issued) row + one full (used) row — masking is authoritative on
// the backend; the tab renders exactly what the API returns.
const ROWS = [
  {
    id: 'rc-issued',
    issuer_user_id: 'u-1',
    issuer_nickname: 'Bob',
    coupon_code: 'REF_USER_BOB_F45ExxxxxxxxxxFF',
    status: 'issued',
    discount_value: '10',
    discount_amount: null,
    commission_tokens_paid: null,
    issued_at: '2026-06-10T00:00:00Z',
    used_at: null,
  },
  {
    id: 'rc-used',
    issuer_user_id: 'u-1',
    issuer_nickname: 'Bob',
    coupon_code: 'REF_USER_BOB_F45E2A5DBB6677FF',
    status: 'used',
    discount_value: '10',
    discount_amount: '5.00',
    commission_tokens_paid: 50,
    issued_at: '2026-06-09T00:00:00Z',
    used_at: '2026-06-11T00:00:00Z',
  },
];

function primeApi(rows = ROWS) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.startsWith('/admin/referral/coupons')) {
      return Promise.resolve({ coupons: rows, total: rows.length });
    }
    return Promise.resolve({});
  });
  vi.mocked(api.post).mockResolvedValue({ deleted: 1 });
}

function mountTab() {
  return mount(ReferralStatisticsTab, {
    global: { plugins: [i18n], stubs: { ImportExportControls: IecStub } },
  });
}

describe('ReferralStatisticsTab.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {}, clearToken: () => {} } as unknown as Parameters<typeof configureAuthStore>[0]['apiClient'],
    });
    const auth = useAuthStore();
    auth.$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    vi.clearAllMocks();
    primeApi();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders rows and shows the masked code for issued, full code for used', async () => {
    const wrapper = mountTab();
    await flushPromises();

    const issuedCode = wrapper.find('[data-testid="referral-stats-code-rc-issued"]').text();
    const usedCode = wrapper.find('[data-testid="referral-stats-code-rc-used"]').text();
    expect(issuedCode).toBe('REF_USER_BOB_F45ExxxxxxxxxxFF');
    expect(issuedCode).toContain('x');
    expect(usedCode).toBe('REF_USER_BOB_F45E2A5DBB6677FF');
  });

  it('leaves discount-amount / commission-tokens empty for an unused row', async () => {
    const wrapper = mountTab();
    await flushPromises();
    const cells = wrapper
      .find('[data-testid="referral-stats-row-rc-issued"]')
      .findAll('td');
    // columns: check, issuer, code, discount %, discount amount, commission, status
    expect(cells[4].text()).toBe('');
    expect(cells[5].text()).toBe('');
  });

  it('status filter re-queries the API with the chosen status', async () => {
    const wrapper = mountTab();
    await flushPromises();

    await wrapper.find('[data-testid="referral-stats-status-filter"]').setValue('used');
    await flushPromises();

    const lastUrl = vi.mocked(api.get).mock.calls.at(-1)?.[0] as string;
    expect(lastUrl).toContain('status=used');
  });

  it('clicking a sortable header re-queries with the sort + order', async () => {
    const wrapper = mountTab();
    await flushPromises();

    await wrapper.findAll('th.sortable')[0].trigger('click');
    await flushPromises();

    const lastUrl = vi.mocked(api.get).mock.calls.at(-1)?.[0] as string;
    expect(lastUrl).toContain('sort=issuer_nickname');
    expect(lastUrl).toContain('order=asc');
  });

  it('bulk-delete posts the selected ids and reloads', async () => {
    const wrapper = mountTab();
    await flushPromises();

    await wrapper.find('[data-testid="referral-stats-select-rc-issued"]').setValue(true);
    await flushPromises();
    expect(wrapper.find('[data-testid="referral-stats-bulk-toolbar"]').exists()).toBe(true);

    await wrapper.find('[data-testid="referral-stats-bulk-delete-btn"]').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/admin/referral/coupons/bulk-delete', {
      ids: ['rc-issued'],
    });
  });

  it('wires the export control to the referral_coupons entity key', async () => {
    capabilities.value = {
      referral_coupons: { can_export: true, can_import: false, can_export_pii: false, supported_formats: ['json', 'csv'] },
    };
    const wrapper = mountTab();
    await flushPromises();
    expect(wrapper.find('[data-testid="iec-stub"]').attributes('data-entity')).toBe(
      'referral_coupons',
    );
    capabilities.value = {};
  });
});
