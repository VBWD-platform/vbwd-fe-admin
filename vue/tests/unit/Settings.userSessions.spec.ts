/**
 * Settings.vue — the host-owned "User sessions" tab.
 *
 * The tab renders every registered `userSessionBlocks[].globalComponent`
 * (permission-filtered via authStore.hasPermission), stacked as blocks. When
 * no block is visible it shows a muted "No session tools available." message.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { defineComponent } from 'vue';
import Settings from '@/views/Settings.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';

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

const GlobalBlock = defineComponent({
  template: '<div data-testid="meinchat-global-block">guest economy tools</div>',
});

function mockApiGet(): void {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/settings') return Promise.resolve({ settings: {} });
    return Promise.resolve({});
  });
}

function seedAuth(permissions: string[]): void {
  setActivePinia(createPinia());
  configureAuthStore({
    storageKey: 'test_token',
    apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
  });
  const authStore = useAuthStore();
  authStore.$patch({
    user: { id: '1', email: 'admin@test.com', role: 'ADMIN', permissions },
    token: 'test-token',
  });
}

async function mountOnUserSessionsTab() {
  const wrapper = mount(Settings);
  await flushPromises();
  await wrapper.find('[data-testid="settings-tab-user-sessions"]').trigger('click');
  await flushPromises();
  return wrapper;
}

describe('Settings.vue — User sessions tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet();
    extensionRegistry.clear();
  });

  afterEach(() => {
    extensionRegistry.clear();
  });

  it('renders a registered global block when the admin has the permission', async () => {
    seedAuth(['meinchat.guests.manage']);
    extensionRegistry.register('meinchat-admin', {
      userSessionBlocks: [
        {
          id: 'meinchat-guest-sessions',
          label: 'Guest economy',
          requiredPermission: 'meinchat.guests.manage',
          globalComponent: GlobalBlock,
        },
      ],
    });

    const wrapper = await mountOnUserSessionsTab();
    expect(wrapper.find('[data-testid="meinchat-global-block"]').exists()).toBe(true);
  });

  it('hides a block whose required permission the admin lacks', async () => {
    seedAuth(['some.other.permission']);
    extensionRegistry.register('meinchat-admin', {
      userSessionBlocks: [
        {
          id: 'meinchat-guest-sessions',
          label: 'Guest economy',
          requiredPermission: 'meinchat.guests.manage',
          globalComponent: GlobalBlock,
        },
      ],
    });

    const wrapper = await mountOnUserSessionsTab();
    expect(wrapper.find('[data-testid="meinchat-global-block"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="user-sessions-empty"]').exists()).toBe(true);
  });
});
