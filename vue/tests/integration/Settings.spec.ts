import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Settings from '@/views/Settings.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

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

describe('Settings.vue', () => {
  let router: ReturnType<typeof createRouter>;

  const mockSettings = {
    provider_name: 'Test Company',
    contact_email: 'admin@test.com',
    website_url: 'https://test.com',
    address_street: '123 Main St',
    address_city: 'Berlin',
    address_postal_code: '10115',
    address_country: 'Germany',
    bank_name: 'Test Bank',
    bank_iban: 'DE89370400440532013000',
    bank_bic: 'COBADEFFXXX'
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {}, clearToken: () => {} } as any,
    });
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    vi.clearAllMocks();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/admin/settings' },
        { path: '/admin/settings', name: 'settings', component: Settings },
        { path: '/admin/settings/token-bundles/new', name: 'token-bundle-new', component: { template: '<div />' } },
        { path: '/admin/settings/token-bundles/:id', name: 'token-bundle-edit', component: { template: '<div />' } }
      ]
    });

    vi.mocked(api.get).mockResolvedValue({ settings: mockSettings });
  });

  it('renders settings tabs', async () => {
    const wrapper = mount(Settings, {
      global: { plugins: [router] }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="settings-tabs"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tab-core-settings"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tab-tokens"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tab-admin-plugins"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tab-backend-plugins"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tab-user-plugins"]').exists()).toBe(true);
  });

  it('no longer renders the Countries and Tax tabs (moved to /admin/settings/tax-and-countries)', async () => {
    const wrapper = mount(Settings, {
      global: { plugins: [router] }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="tab-countries"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="tab-tax"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="countries-content"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="tax-content"]').exists()).toBe(false);
  });

  it('displays current settings values in core settings tab', async () => {
    const wrapper = mount(Settings, {
      global: { plugins: [router] }
    });

    await flushPromises();

    const providerNameInput = wrapper.find('[data-testid="provider-name-input"]');
    expect((providerNameInput.element as HTMLInputElement).value).toBe('Test Company');
  });

  it('shows loading state while fetching settings', async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

    const wrapper = mount(Settings, {
      global: { plugins: [router] }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
  });

  it('can update core settings', async () => {
    vi.mocked(api.put).mockResolvedValue({ settings: { ...mockSettings, provider_name: 'New Company' } });

    const wrapper = mount(Settings, {
      global: { plugins: [router] }
    });

    await flushPromises();

    const providerNameInput = wrapper.find('[data-testid="provider-name-input"]');
    await providerNameInput.setValue('New Company');

    const saveBtn = wrapper.find('[data-testid="save-core-settings-button"]');
    await saveBtn.trigger('click');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/admin/settings', expect.objectContaining({
      provider_name: 'New Company'
    }));
  });

  it('displays success message after save', async () => {
    vi.mocked(api.put).mockResolvedValue({ settings: mockSettings });

    const wrapper = mount(Settings, {
      global: { plugins: [router] }
    });

    await flushPromises();

    const saveBtn = wrapper.find('[data-testid="save-core-settings-button"]');
    await saveBtn.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="success-message"]').exists()).toBe(true);
  });

  it('displays error message on save failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.put).mockRejectedValue(new Error('Failed to save settings'));

    const wrapper = mount(Settings, {
      global: { plugins: [router] }
    });

    await flushPromises();

    const saveBtn = wrapper.find('[data-testid="save-core-settings-button"]');
    await saveBtn.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);

    consoleSpy.mockRestore();
  });

  it('can switch between tabs', async () => {
    const wrapper = mount(Settings, {
      global: { plugins: [router] }
    });

    await flushPromises();

    // Initially core settings tab should be visible
    expect(wrapper.find('[data-testid="core-settings-content"]').isVisible()).toBe(true);

    // Click on tokens tab
    await wrapper.find('[data-testid="tab-tokens"]').trigger('click');
    expect(wrapper.find('[data-testid="tokens-content"]').isVisible()).toBe(true);
  });

  it('shows error state on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValue(new Error('Failed to load settings'));

    const wrapper = mount(Settings, {
      global: { plugins: [router] }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="fetch-error"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Failed to load settings');

    consoleSpy.mockRestore();
  });

  it('displays token bundles section in tokens tab', async () => {
    const wrapper = mount(Settings, {
      global: { plugins: [router] }
    });

    await flushPromises();

    // Switch to tokens tab
    await wrapper.find('[data-testid="tab-tokens"]').trigger('click');

    expect(wrapper.find('[data-testid="create-bundle-btn"]').exists()).toBe(true);
  });
});
