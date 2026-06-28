import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, getActivePinia } from 'pinia';
import BackendPluginDetails from '@/views/BackendPluginDetails.vue';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

// S108.6 — dependency surface + real refusal reason on the plugin detail view.
const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  default: { install: vi.fn(), global: { t: (key: string) => key } },
  initLocale: vi.fn(),
  setLocale: vi.fn(),
  availableLocales: ['en', 'de'],
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { pluginName: 'booking' } }),
  useRouter: () => ({ push: vi.fn() }),
}));

const baseDetail = {
  name: 'booking',
  version: '26.7',
  author: 'VBWD Team',
  description: 'Booking plugin',
  status: 'inactive',
  dependencies: [],
  configSchema: {},
  adminConfig: { tabs: [] },
  savedConfig: {},
};

function mountComponent() {
  return mount(BackendPluginDetails, {
    global: {
      plugins: [getActivePinia()!],
      stubs: {
        'router-link': { template: '<a><slot /></a>', props: ['to'] },
      },
      mocks: { $t: (key: string) => key },
    },
  });
}

describe('BackendPluginDetails — dependencies block', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {} } as never,
    });
    useAuthStore().$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    mockGet.mockResolvedValue(baseDetail);
    mockPut.mockResolvedValue({});
    mockPost.mockResolvedValue({ status: 'enabled' });
  });

  it('renders a satisfied dependency with its installed version and a ✓', async () => {
    mockGet.mockResolvedValue({
      ...baseDetail,
      dependencies: [{ name: 'cms', specifier: '~=26.6', installed_version: '26.6', satisfied: true }],
    });
    const wrapper = mountComponent();
    await flushPromises();

    const block = wrapper.find('[data-testid="plugin-dependencies"]');
    expect(block.exists()).toBe(true);
    const row = wrapper.find('[data-testid="plugin-dependency-cms"]');
    expect(row.exists()).toBe(true);
    expect(row.text()).toContain('cms');
    expect(row.text()).toContain('~=26.6');
    expect(row.text()).toContain('26.6');
    expect(row.find('[data-testid="plugin-dependency-cms-status"]').classes()).toContain('dep-satisfied');
  });

  it('flags an unsatisfied dependency with a ✗ and shows "any" + "—" defaults', async () => {
    mockGet.mockResolvedValue({
      ...baseDetail,
      dependencies: [
        { name: 'email', specifier: '>=26.7', installed_version: '26.6', satisfied: false },
        { name: 'cms', specifier: '', installed_version: null, satisfied: true },
      ],
    });
    const wrapper = mountComponent();
    await flushPromises();

    const emailStatus = wrapper.find('[data-testid="plugin-dependency-email-status"]');
    expect(emailStatus.classes()).toContain('dep-unsatisfied');
    // unconstrained dep shows "any" for the spec and "—" for the missing version
    const cmsRow = wrapper.find('[data-testid="plugin-dependency-cms"]');
    expect(cmsRow.text()).toContain('any');
    expect(cmsRow.text()).toContain('—');
  });

  it('does not crash on the OLD plain-string dependency shape', async () => {
    mockGet.mockResolvedValue({ ...baseDetail, dependencies: ['cms', 'email'] });
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="plugin-dependencies"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="plugin-dependency-cms"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="plugin-dependency-email"]').exists()).toBe(true);
  });

  it('omits the dependencies block when there are none', async () => {
    mockGet.mockResolvedValue({ ...baseDetail, dependencies: [] });
    const wrapper = mountComponent();
    await flushPromises();
    expect(wrapper.find('[data-testid="plugin-dependencies"]').exists()).toBe(false);
  });

  it('disables the Activate button and shows the blocked reason when a dependency is unsatisfied', async () => {
    mockGet.mockResolvedValue({
      ...baseDetail,
      dependencies: [{ name: 'email', specifier: '>=26.7', installed_version: '26.6', satisfied: false }],
    });
    const wrapper = mountComponent();
    await flushPromises();

    const btn = wrapper.find('[data-testid="activate-plugin-btn"]');
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
    expect(wrapper.find('[data-testid="enable-blocked-reason"]').text()).toContain('email>=26.7');
    expect(wrapper.find('[data-testid="enable-blocked-reason"]').text()).toContain('26.6');
  });

  it('surfaces the backend 422 refusal reason in the error message on activate failure', async () => {
    const reason = "Cannot enable 'booking': requires 'email>=26.7' but 'email' v26.6 is installed";
    mockPost.mockRejectedValue(Object.assign(new Error(reason), { status: 422 }));
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.find('[data-testid="activate-plugin-btn"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="error-message"]').text()).toContain(reason);
  });
});
