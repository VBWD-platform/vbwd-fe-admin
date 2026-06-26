import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { nextTick } from 'vue';
import Settings from '@/views/Settings.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import { reloadApp } from '@/utils/reload';
import { usePluginsStore } from '@/stores/plugins';
import { useUserPluginsStore } from '@/stores/userPlugins';

// S102 — bulk plugin activate/deactivate + table UX (pagination, rows-per-page,
// two-scope select-all) on the three Settings plugin tabs.
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

// 30 active backend plugins → 2 pages at the default 25/page.
const backendPlugins = Array.from({ length: 30 }, (_unused, index) => {
  const name = `p${String(index + 1).padStart(2, '0')}`;
  return { name, version: '1.0.0', description: '', status: 'active' as const };
});

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

async function mountOnTab(tabTestId: string): Promise<VueWrapper> {
  const wrapper = mount(Settings);
  await flushPromises();
  await wrapper.find(`[data-testid="${tabTestId}"]`).trigger('click');
  await flushPromises();
  return wrapper;
}

describe('Settings.vue — backend plugins table UX + bulk', () => {
  beforeEach(seedAdmin);

  it('paginates at 25/page and renders the rows-per-page control', async () => {
    const wrapper = await mountOnTab('tab-backend-plugins');
    expect(wrapper.find('[data-testid="backend-plugins-rows-per-page"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="backend-plugin-row"]')).toHaveLength(25);
    expect(wrapper.find('[data-testid="backend-plugins-next-page"]').exists()).toBe(true);
  });

  it('quicksearch narrows the result (and the table shrinks accordingly)', async () => {
    const wrapper = await mountOnTab('tab-backend-plugins');
    await wrapper.find('[data-testid="backend-plugin-search"]').setValue('p2');
    await flushPromises();
    // p20..p29 → 10 rows, all containing "p2"
    const rows = wrapper.findAll('[data-testid="backend-plugin-row"]');
    expect(rows).toHaveLength(10);
  });

  it('select-all toggles the current page, then "select all matching" extends to every match', async () => {
    const wrapper = await mountOnTab('tab-backend-plugins');

    await wrapper.find('[data-testid="backend-plugins-select-page"]').setValue(true);
    await flushPromises();
    expect(wrapper.find('[data-testid="backend-plugins-bulk-count"]').text()).toContain('25');

    // banner appears because a full page is selected and more rows match
    const banner = wrapper.find('[data-testid="backend-plugins-select-all-matching"]');
    expect(banner.exists()).toBe(true);
    await banner.trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="backend-plugins-bulk-count"]').text()).toContain('30');
  });

  it('bulk deactivate calls /disable per active selected, reloads the list, clears selection', async () => {
    vi.mocked(api.post).mockResolvedValue({});
    const wrapper = await mountOnTab('tab-backend-plugins');

    await wrapper.find('[data-testid="backend-plugins-select-page"]').setValue(true);
    await flushPromises();
    await wrapper.find('[data-testid="backend-plugins-bulk-deactivate"]').trigger('click');
    await flushPromises();

    const disableCalls = vi.mocked(api.post).mock.calls.filter(call =>
      String(call[0]).endsWith('/disable'),
    );
    expect(disableCalls).toHaveLength(25);
    expect(api.post).toHaveBeenCalledWith('/admin/plugins/p01/disable');
    // list refetched (initial + after bulk)
    const pluginFetches = vi.mocked(api.get).mock.calls.filter(call => call[0] === '/admin/plugins');
    expect(pluginFetches.length).toBeGreaterThanOrEqual(2);
    // selection cleared → toolbar gone
    expect(wrapper.find('[data-testid="backend-plugins-bulk-toolbar"]').exists()).toBe(false);
  });

  it('a failure on one plugin still processes the rest and surfaces the message', async () => {
    vi.mocked(api.post).mockImplementation((url: string) => {
      if (url === '/admin/plugins/p02/disable') return Promise.reject(new Error('boom'));
      return Promise.resolve({});
    });
    const wrapper = await mountOnTab('tab-backend-plugins');

    await wrapper.find('[data-testid="backend-plugins-select-page"]').setValue(true);
    await flushPromises();
    await wrapper.find('[data-testid="backend-plugins-bulk-deactivate"]').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/admin/plugins/p01/disable');
    expect(api.post).toHaveBeenCalledWith('/admin/plugins/p02/disable');
    expect(wrapper.find('[data-testid="backend-plugins-error"]').text()).toContain('p02');
  });
});

describe('Settings.vue — admin plugins bulk (reload once)', () => {
  beforeEach(seedAdmin);

  it('bulk deactivate loops the store for active rows and reloads the SPA once', async () => {
    const wrapper = mount(Settings);
    await flushPromises();
    const store = usePluginsStore();
    vi.spyOn(store, 'fetchPlugins').mockResolvedValue([]);
    const deactivateSpy = vi.spyOn(store, 'deactivatePlugin').mockResolvedValue();
    store.plugins = [
      { name: 'a-active', version: '1', description: '', enabled: true, installedAt: '', source: 'local', status: 'active' },
      { name: 'a-inactive', version: '1', description: '', enabled: false, installedAt: '', source: 'local', status: 'inactive' },
    ];
    await wrapper.find('[data-testid="tab-admin-plugins"]').trigger('click');
    await flushPromises();
    await nextTick();

    await wrapper.find('[data-testid="admin-plugins-select-page"]').setValue(true);
    await flushPromises();
    await wrapper.find('[data-testid="admin-plugins-bulk-deactivate"]').trigger('click');
    await flushPromises();

    // only the active row is deactivated; the inactive one is skipped
    expect(deactivateSpy).toHaveBeenCalledTimes(1);
    expect(deactivateSpy).toHaveBeenCalledWith('a-active');
    expect(reloadApp).toHaveBeenCalledTimes(1);
  });

  it('does not reload when nothing changed (all selected already inactive)', async () => {
    const wrapper = mount(Settings);
    await flushPromises();
    const store = usePluginsStore();
    vi.spyOn(store, 'fetchPlugins').mockResolvedValue([]);
    vi.spyOn(store, 'deactivatePlugin').mockResolvedValue();
    store.plugins = [
      { name: 'a-inactive', version: '1', description: '', enabled: false, installedAt: '', source: 'local', status: 'inactive' },
    ];
    await wrapper.find('[data-testid="tab-admin-plugins"]').trigger('click');
    await flushPromises();
    await nextTick();

    await wrapper.find('[data-testid="admin-plugins-select-page"]').setValue(true);
    await flushPromises();
    await wrapper.find('[data-testid="admin-plugins-bulk-deactivate"]').trigger('click');
    await flushPromises();

    expect(reloadApp).not.toHaveBeenCalled();
  });
});

describe('Settings.vue — user plugins bulk (skips uninstalled)', () => {
  beforeEach(seedAdmin);

  it('bulk deactivate disables active rows, skips uninstalled, reports skipped', async () => {
    const wrapper = mount(Settings);
    await flushPromises();
    const store = useUserPluginsStore();
    vi.spyOn(store, 'fetchPlugins').mockResolvedValue();
    const disableSpy = vi.spyOn(store, 'disablePlugin').mockResolvedValue();
    store.plugins = [
      { name: 'u-active', version: '1', description: '', status: 'active', hasConfig: false },
      { name: 'u-uninstalled', version: '1', description: '', status: 'uninstalled', hasConfig: false },
    ];
    await wrapper.find('[data-testid="tab-user-plugins"]').trigger('click');
    await flushPromises();
    await nextTick();

    await wrapper.find('[data-testid="user-plugins-select-page"]').setValue(true);
    await flushPromises();
    await wrapper.find('[data-testid="user-plugins-bulk-deactivate"]').trigger('click');
    await flushPromises();

    expect(disableSpy).toHaveBeenCalledTimes(1);
    expect(disableSpy).toHaveBeenCalledWith('u-active');
    expect(wrapper.find('[data-testid="user-plugins-error"]').text()).toContain('u-uninstalled');
  });
});
