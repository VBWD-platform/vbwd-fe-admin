import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import UserPluginDetails from '@/views/UserPluginDetails.vue';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

// Mock the userPluginApi
vi.mock('@/api/userPluginApi', () => ({
  userPluginApi: {
    fetchPlugins: vi.fn(),
    fetchPluginDetail: vi.fn(),
    savePluginConfig: vi.fn(),
    enablePlugin: vi.fn(),
    disablePlugin: vi.fn(),
    installPlugin: vi.fn(),
    uninstallPlugin: vi.fn()
  }
}));

import { userPluginApi } from '@/api/userPluginApi';

const mockDetail = {
  name: 'landing1',
  version: '1.0.0',
  description: 'Public landing page with tariff plan selection',
  author: '',
  status: 'active' as const,
  dependencies: [],
  configSchema: {
    heroTitle: { type: 'string', default: 'Choose Your Plan', description: 'Main heading on the landing page' },
    showPrices: { type: 'boolean', default: true, description: 'Display prices on plan cards' }
  },
  adminConfig: {
    tabs: [{
      id: 'general',
      label: 'General',
      fields: [
        { key: 'heroTitle', label: 'Hero Title', component: 'input', inputType: 'text' },
        { key: 'showPrices', label: 'Show Prices', component: 'checkbox' }
      ]
    }]
  },
  savedConfig: { heroTitle: 'Custom Title', showPrices: true }
};

describe('UserPluginDetails.vue', () => {
  let router: ReturnType<typeof createRouter>;

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
        {
          path: '/admin/settings/user-plugins/:pluginName',
          name: 'user-plugin-details',
          component: UserPluginDetails
        },
        {
          path: '/admin/settings',
          name: 'settings',
          component: { template: '<div />' }
        }
      ]
    });
  });

  async function mountComponent(pluginName = 'landing1') {
    await router.push(`/admin/settings/user-plugins/${pluginName}`);
    await router.isReady();

    return mount(UserPluginDetails, {
      global: { plugins: [router] }
    });
  }

  it('renders plugin header with name, version, and status', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockResolvedValue(mockDetail);

    const wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="plugin-name"]').text()).toBe('landing1');
    expect(wrapper.find('.plugin-version').text()).toBe('v1.0.0');
    expect(wrapper.find('[data-testid="plugin-status"]').exists()).toBe(true);
  });

  it('renders plugin description', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockResolvedValue(mockDetail);

    const wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="plugin-description"]').text()).toBe(
      'Public landing page with tariff plan selection'
    );
  });

  it('renders config tabs from admin-config', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockResolvedValue(mockDetail);

    const wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="config-tabs"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="config-tab-general"]').exists()).toBe(true);
  });

  it('renders config fields correctly', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockResolvedValue(mockDetail);

    const wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="config-field-heroTitle"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="config-field-showPrices"]').exists()).toBe(true);

    const titleInput = wrapper.find('[data-testid="config-input-heroTitle"]');
    expect((titleInput.element as HTMLInputElement).value).toBe('Custom Title');
  });

  it('shows deactivate button when plugin is active', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockResolvedValue(mockDetail);

    const wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="deactivate-plugin-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="activate-plugin-btn"]').exists()).toBe(false);
  });

  it('shows activate button when plugin is inactive', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockResolvedValue({
      ...mockDetail,
      status: 'inactive'
    });

    const wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="activate-plugin-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="deactivate-plugin-btn"]').exists()).toBe(false);
  });

  it('shows install button when plugin is uninstalled', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockResolvedValue({
      ...mockDetail,
      status: 'uninstalled'
    });

    const wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="install-plugin-btn"]').exists()).toBe(true);
  });

  it('shows loading state while fetching', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockImplementation(() => new Promise(() => {}));

    const wrapper = await mountComponent();

    expect(wrapper.find('[data-testid="plugin-loading"]').exists()).toBe(true);
  });

  it('shows error state on connection failure', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockRejectedValue(
      new Error('Cannot connect to user application')
    );

    const wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="plugin-error"]').exists()).toBe(true);
  });

  it('shows back link to settings', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockResolvedValue(mockDetail);

    const wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="back-to-user-plugins"]').exists()).toBe(true);
  });

  it('shows save config button', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockResolvedValue(mockDetail);

    const wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="save-config-btn"]').exists()).toBe(true);
  });

  it('shows no-config message for plugins without config', async () => {
    vi.mocked(userPluginApi.fetchPluginDetail).mockResolvedValue({
      ...mockDetail,
      adminConfig: { tabs: [] },
      configSchema: {},
      savedConfig: {}
    });

    const wrapper = await mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="no-config"]').exists()).toBe(true);
  });
});
