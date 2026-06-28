import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import Settings from '@/views/Settings.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

// S108.6 — the backend plugins table must (a) block Enable when a declared
// dependency is unsatisfied and explain why, and (b) surface the real backend
// 422 refusal reason when an enable attempt is rejected.
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
vi.mock('@/utils/reload', () => ({ reloadApp: vi.fn() }));

const backendPlugins = [
  { name: 'analytics', version: '26.6', description: '', status: 'inactive', dependencies: [] },
  {
    name: 'booking',
    version: '26.7',
    description: '',
    status: 'inactive',
    dependencies: [{ name: 'email', specifier: '>=26.7', installed_version: '26.6', satisfied: false }],
  },
];

function mockApiGet(): void {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/settings') return Promise.resolve({ settings: {} });
    if (url === '/admin/plugins') return Promise.resolve({ plugins: backendPlugins });
    if (url === '/admin/data-exchange/manifest') return Promise.resolve({ entities: [] });
    return Promise.resolve({});
  });
}

function seedAdmin(): void {
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
  mockApiGet();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
}

async function mountOnBackendTab(): Promise<VueWrapper> {
  const wrapper = mount(Settings);
  await flushPromises();
  await wrapper.find('[data-testid="tab-backend-plugins"]').trigger('click');
  await flushPromises();
  return wrapper;
}

function rowFor(wrapper: VueWrapper, name: string) {
  return wrapper
    .findAll('[data-testid="backend-plugin-row"]')
    .find(row => row.find('.bundle-name').text().includes(name))!;
}

describe('Settings.vue — backend plugin dependency gating', () => {
  beforeEach(seedAdmin);

  it('disables Enable + shows a blocked note for a plugin with an unsatisfied dependency', async () => {
    const wrapper = await mountOnBackendTab();

    const bookingRow = rowFor(wrapper, 'booking');
    const enableBtn = bookingRow.find('[data-testid="enable-backend-plugin-btn"]');
    expect(enableBtn.exists()).toBe(true);
    expect((enableBtn.element as HTMLButtonElement).disabled).toBe(true);
    const note = bookingRow.find('[data-testid="backend-plugin-blocked-booking"]');
    expect(note.exists()).toBe(true);
    expect(note.text()).toContain('email>=26.7');
    expect(note.text()).toContain('26.6');
  });

  it('leaves Enable active for a plugin with no unsatisfied dependency', async () => {
    const wrapper = await mountOnBackendTab();

    const analyticsRow = rowFor(wrapper, 'analytics');
    const enableBtn = analyticsRow.find('[data-testid="enable-backend-plugin-btn"]');
    expect((enableBtn.element as HTMLButtonElement).disabled).toBe(false);
    expect(analyticsRow.find('[data-testid="backend-plugin-blocked-analytics"]').exists()).toBe(false);
  });

  it('surfaces the backend 422 refusal reason when enable is rejected', async () => {
    const reason = "Cannot enable 'booking': requires 'email>=26.7' but 'email' v26.6 is installed";
    vi.mocked(api.post).mockRejectedValue(Object.assign(new Error(reason), { status: 422 }));
    const wrapper = await mountOnBackendTab();

    const analyticsRow = rowFor(wrapper, 'analytics');
    await analyticsRow.find('[data-testid="enable-backend-plugin-btn"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="backend-plugins-error"]').text()).toContain(reason);
  });

  it('does not crash when a plugin sends the OLD plain-string dependency shape', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/admin/settings') return Promise.resolve({ settings: {} });
      if (url === '/admin/plugins') {
        return Promise.resolve({
          plugins: [{ name: 'cms', version: '26.6', description: '', status: 'inactive', dependencies: ['email'] }],
        });
      }
      if (url === '/admin/data-exchange/manifest') return Promise.resolve({ entities: [] });
      return Promise.resolve({});
    });
    const wrapper = await mountOnBackendTab();

    const cmsRow = rowFor(wrapper, 'cms');
    expect((cmsRow.find('[data-testid="enable-backend-plugin-btn"]').element as HTMLButtonElement).disabled).toBe(false);
  });
});
