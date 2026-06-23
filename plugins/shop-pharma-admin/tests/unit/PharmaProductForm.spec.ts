import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import PharmaProductForm from '../../src/views/PharmaProductForm.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn(),
}));

const mockRegion = {
  country_code: 'DE',
  name: 'Germany',
  locale: 'de-DE',
  display_currency: 'EUR',
  national_code_scheme: 'PZN',
  national_register_url: 'https://example/register',
  registered_pharmacy_logo_url: 'https://example/logo.png',
  pharmacovigilance_url: 'https://example/pv',
  withdrawal_right_copy: 'copy',
  default_age_restriction_years: 0,
  default_max_quantity_per_order: 5,
  regime: 'EU',
  operator_verify: true,
};

function mountForm() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/pharma/region') return Promise.resolve({ region: mockRegion });
    return Promise.resolve({});
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/pharma/products', name: 'pharma-products', component: { template: '<div/>' } },
      { path: '/admin/pharma/products/new', name: 'pharma-product-new', component: PharmaProductForm },
      { path: '/admin/pharma/products/:id/edit', name: 'pharma-product-edit', component: PharmaProductForm },
    ],
  });
  return router;
}

describe('PharmaProductForm.vue — classification drives the visible field subset', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
    });
    useAuthStore().$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    vi.clearAllMocks();
  });

  it('shows medicine substance fields + required markers for OTC', async () => {
    const router = mountForm();
    await router.push('/admin/pharma/products/new');
    const wrapper = mount(PharmaProductForm, { global: { plugins: [router] } });
    await flushPromises();

    // Default class is OTC: substance fields visible, device_marking hidden.
    expect(wrapper.find('[data-testid="pharma-field-active_substances"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pharma-field-strength"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pharma-field-device_marking"]').exists()).toBe(false);
    // active_substances/strength/pharmaceutical_form/leaflet_url are required for OTC.
    expect(wrapper.find('[data-testid="pharma-required-active_substances"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pharma-required-leaflet_url"]').exists()).toBe(true);
  });

  it('switches to device fields and hides medicine fields for MEDICAL_DEVICE', async () => {
    const router = mountForm();
    await router.push('/admin/pharma/products/new');
    const wrapper = mount(PharmaProductForm, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('[data-testid="pharma-product-class"]').setValue('MEDICAL_DEVICE');
    await flushPromises();

    expect(wrapper.find('[data-testid="pharma-field-device_marking"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pharma-required-device_marking"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pharma-field-active_substances"]').exists()).toBe(false);
  });

  it('shows the prescription-required gating notice for RX', async () => {
    const router = mountForm();
    await router.push('/admin/pharma/products/new');
    const wrapper = mount(PharmaProductForm, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.find('[data-testid="pharma-rx-notice"]').exists()).toBe(false);
    await wrapper.find('[data-testid="pharma-product-class"]').setValue('RX');
    await flushPromises();
    expect(wrapper.find('[data-testid="pharma-rx-notice"]').exists()).toBe(true);
    // RX requires the marketing authorisation holder.
    expect(wrapper.find('[data-testid="pharma-required-marketing_authorisation_holder"]').exists()).toBe(true);
  });

  it('locks the pack-variant editor until the product is saved', async () => {
    const router = mountForm();
    await router.push('/admin/pharma/products/new');
    const wrapper = mount(PharmaProductForm, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.find('[data-testid="pharma-variants-locked"]').exists()).toBe(true);
  });

  it('surfaces the backend RequiredFieldsByClass rejection on save', async () => {
    const router = mountForm();
    await router.push('/admin/pharma/products/new');
    const wrapper = mount(PharmaProductForm, { global: { plugins: [router] } });
    await flushPromises();

    vi.mocked(api.post).mockRejectedValue(
      Object.assign(new Error("Class 'OTC' requires: active_substances, strength"), { status: 400 }),
    );
    await wrapper.find('[data-testid="pharma-save-btn"]').trigger('submit');
    await flushPromises();

    const rejection = wrapper.find('[data-testid="pharma-save-rejection"]');
    expect(rejection.exists()).toBe(true);
    expect(rejection.text()).toContain("Class 'OTC' requires");
  });
});
