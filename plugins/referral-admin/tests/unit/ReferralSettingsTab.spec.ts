import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { api } from '@/api';
import ReferralSettingsTab from '../../src/views/ReferralSettingsTab.vue';
import en from '../../locales/en.json';

vi.mock('@/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en: { ...en, common: { save: 'Save' } } },
});

const TEMPLATE_COUPONS = [
  { id: 'tmpl-1', code: 'SUMMER10' },
  { id: 'tmpl-2', code: 'WINTER20' },
];

function primeApi(settings: Record<string, unknown>) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/referral/settings') return Promise.resolve({ settings });
    if (url === '/admin/coupons') return Promise.resolve({ coupons: TEMPLATE_COUPONS });
    return Promise.resolve({});
  });
  vi.mocked(api.put).mockResolvedValue({ settings });
}

function mountTab() {
  return mount(ReferralSettingsTab, { global: { plugins: [i18n] } });
}

describe('ReferralSettingsTab.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads current settings into the form', async () => {
    primeApi({
      commission_type: 'percent_of_sale',
      commission_value: '12.5',
      selected_template_coupon_ids: ['tmpl-1'],
    });
    const wrapper = mountTab();
    await flushPromises();

    const percentRadio = wrapper.find('[data-testid="commission-type-percent"]')
      .element as HTMLInputElement;
    expect(percentRadio.checked).toBe(true);
    const valueInput = wrapper.find('[data-testid="commission-value"]')
      .element as HTMLInputElement;
    expect(valueInput.value).toBe('12.5');
    // The pre-selected template appears on the "assigned" side of the dual list.
    expect(wrapper.find('[data-testid="dual-list-assigned-tmpl-1"]').exists()).toBe(true);
  });

  it('toggling type + value + dual-list selection PUTs the new settings', async () => {
    primeApi({
      commission_type: 'absolute_tokens',
      commission_value: '0',
      selected_template_coupon_ids: [],
    });
    const wrapper = mountTab();
    await flushPromises();

    await wrapper.find('[data-testid="commission-type-percent"]').setValue();
    await wrapper.find('[data-testid="commission-value"]').setValue('15');
    // Assign a template via the dual-list (mirrors the countries picker).
    await wrapper.find('[data-testid="dual-list-assign-tmpl-2"]').trigger('click');
    await flushPromises();

    await wrapper.find('[data-testid="referral-settings-save"]').trigger('click');
    await flushPromises();

    const [putUrl, putBody] = vi.mocked(api.put).mock.calls[0];
    expect(putUrl).toBe('/admin/referral/settings');
    expect((putBody as { commission_type: string }).commission_type).toBe('percent_of_sale');
    // A number input may yield a numeric value; the backend coerces to Decimal.
    expect(String((putBody as { commission_value: unknown }).commission_value)).toBe('15');
    expect((putBody as { selected_template_coupon_ids: string[] }).selected_template_coupon_ids).toEqual(['tmpl-2']);
    expect(wrapper.find('[data-testid="referral-settings-saved"]').exists()).toBe(true);
  });
});
