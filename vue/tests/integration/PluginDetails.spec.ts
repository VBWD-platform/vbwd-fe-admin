import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import PluginDetails from '@/views/PluginDetails.vue';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

const mockPluginDetail = {
  name: 'analytics-widget',
  version: '1.0.0',
  description: 'Displays active sessions count on the dashboard',
  enabled: true,
  status: 'active' as const,
  configSchema: {
    refreshInterval: { type: 'number' as const, default: 30, description: 'Data refresh interval in seconds' },
    showChart: { type: 'boolean' as const, default: true, description: 'Show chart visualization' },
    maxDataPoints: { type: 'number' as const, default: 50, description: 'Maximum data points to display' }
  },
  adminConfig: {
    tabs: [
      {
        id: 'general',
        label: 'General',
        fields: [
          { key: 'refreshInterval', label: 'Refresh Interval (seconds)', component: 'input' as const, inputType: 'number', min: 5, max: 300 },
          { key: 'showChart', label: 'Show Chart', component: 'checkbox' as const }
        ]
      },
      {
        id: 'display',
        label: 'Display',
        fields: [
          { key: 'maxDataPoints', label: 'Max Data Points', component: 'input' as const, inputType: 'number', min: 10, max: 500 }
        ]
      }
    ]
  },
  savedConfig: {}
};

// Mock the plugins store
const mockFetchPluginDetail = vi.fn();
const mockSavePluginConfig = vi.fn();
const mockActivatePlugin = vi.fn();
const mockDeactivatePlugin = vi.fn();
const mockUninstallPlugin = vi.fn();

vi.mock('@/stores/plugins', () => ({
  usePluginsStore: () => ({
    fetchPluginDetail: mockFetchPluginDetail,
    savePluginConfig: mockSavePluginConfig,
    activatePlugin: mockActivatePlugin,
    deactivatePlugin: mockDeactivatePlugin,
    uninstallPlugin: mockUninstallPlugin,
  }),
}));

describe('PluginDetails.vue', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(async () => {
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
        { path: '/admin/settings/plugins/:pluginName', name: 'plugin-details', component: PluginDetails },
        { path: '/admin/settings', name: 'settings', component: { template: '<div />' } }
      ]
    });

    await router.push('/admin/settings/plugins/analytics-widget');
    await router.isReady();
  });

  function mountComponent() {
    return mount(PluginDetails, {
      global: { plugins: [router] }
    });
  }

  it('shows loading state while fetching', async () => {
    mockFetchPluginDetail.mockImplementation(() => new Promise(() => {}));

    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="plugin-loading"]').exists()).toBe(true);
  });

  it('renders plugin header with name, version, description', async () => {
    mockFetchPluginDetail.mockResolvedValue(mockPluginDetail);

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="plugin-name"]').text()).toBe('analytics-widget');
    expect(wrapper.text()).toContain('v1.0.0');
    expect(wrapper.find('[data-testid="plugin-description"]').text()).toContain('Displays active sessions');
  });

  it('renders status badge', async () => {
    mockFetchPluginDetail.mockResolvedValue(mockPluginDetail);

    const wrapper = mountComponent();
    await flushPromises();

    const badge = wrapper.find('[data-testid="plugin-status"]');
    expect(badge.exists()).toBe(true);
    expect(badge.classes()).toContain('active');
  });

  it('renders config tabs from admin-config', async () => {
    mockFetchPluginDetail.mockResolvedValue(mockPluginDetail);

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="config-tabs"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="config-tab-general"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="config-tab-display"]').exists()).toBe(true);
  });

  it('renders form fields for active tab', async () => {
    mockFetchPluginDetail.mockResolvedValue(mockPluginDetail);

    const wrapper = mountComponent();
    await flushPromises();

    // General tab is active by default
    expect(wrapper.find('[data-testid="config-field-refreshInterval"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="config-field-showChart"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="config-input-refreshInterval"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="config-input-showChart"]').exists()).toBe(true);
  });

  it('switches config tabs on click', async () => {
    mockFetchPluginDetail.mockResolvedValue(mockPluginDetail);

    const wrapper = mountComponent();
    await flushPromises();

    // Click display tab
    await wrapper.find('[data-testid="config-tab-display"]').trigger('click');

    // Display tab content should be visible
    expect(wrapper.find('[data-testid="config-content-display"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="config-field-maxDataPoints"]').isVisible()).toBe(true);
  });

  it('saves config on save button click', async () => {
    mockFetchPluginDetail.mockResolvedValue(mockPluginDetail);
    mockSavePluginConfig.mockResolvedValue(undefined);

    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.find('[data-testid="save-config-btn"]').trigger('click');
    await flushPromises();

    expect(mockSavePluginConfig).toHaveBeenCalledWith(
      'analytics-widget',
      expect.objectContaining({ refreshInterval: expect.any(Number) })
    );
    expect(wrapper.find('[data-testid="success-message"]').exists()).toBe(true);
  });

  it('shows deactivate button when plugin is active', async () => {
    mockFetchPluginDetail.mockResolvedValue(mockPluginDetail);

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="deactivate-plugin-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="activate-plugin-btn"]').exists()).toBe(false);
  });

  it('shows activate button when plugin is inactive', async () => {
    mockFetchPluginDetail.mockResolvedValue({
      ...mockPluginDetail, status: 'inactive', enabled: false
    });

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="activate-plugin-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="deactivate-plugin-btn"]').exists()).toBe(false);
  });

  it('shows uninstall button', async () => {
    mockFetchPluginDetail.mockResolvedValue(mockPluginDetail);

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="uninstall-plugin-btn"]').exists()).toBe(true);
  });

  it('shows error state on fetch failure', async () => {
    mockFetchPluginDetail.mockRejectedValue(new Error('Failed to load'));

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="plugin-error"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Failed to load');
  });

  it('has back link to settings', async () => {
    mockFetchPluginDetail.mockResolvedValue(mockPluginDetail);

    const wrapper = mountComponent();
    await flushPromises();

    const backLink = wrapper.find('[data-testid="back-to-plugins"]');
    expect(backLink.exists()).toBe(true);
    expect(backLink.attributes('href')).toBe('/admin/settings');
  });

  it('initializes config values from defaults when no saved config', async () => {
    mockFetchPluginDetail.mockResolvedValue(mockPluginDetail);

    const wrapper = mountComponent();
    await flushPromises();

    // refreshInterval default is 30
    const input = wrapper.find('[data-testid="config-input-refreshInterval"]');
    expect(Number((input.element as HTMLInputElement).value)).toBe(30);
  });

  it('uses saved config values over defaults', async () => {
    mockFetchPluginDetail.mockResolvedValue({
      ...mockPluginDetail, savedConfig: { refreshInterval: 60 }
    });

    const wrapper = mountComponent();
    await flushPromises();

    const input = wrapper.find('[data-testid="config-input-refreshInterval"]');
    expect(Number((input.element as HTMLInputElement).value)).toBe(60);
  });
});
