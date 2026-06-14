import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import Settings from '@/views/Settings.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

// Token Bundles section (Settings → Tokens tab) gains two capabilities:
//  1. bulk select + bulk delete, mirroring the house pattern in TaxesTab.vue
//     (a `selectedIds` Set, per-row checkbox + select-all, a bulk-toolbar with
//     a selected-count + Delete-selected action looping the single-delete
//     endpoint DELETE /admin/token-bundles/<id>).
//  2. the shared core ImportExportControls scoped to the `token_bundles`
//     exchanger, gated by the data-exchange manifest.
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

const mockBundles = [
  {
    id: 'tb-1',
    name: 'Starter Pack',
    description: '100 tokens',
    token_amount: 100,
    price: '9.99',
    is_active: true,
    sort_order: 1,
    created_at: null,
    updated_at: null,
  },
  {
    id: 'tb-2',
    name: 'Pro Pack',
    description: '500 tokens',
    token_amount: 500,
    price: '39.99',
    is_active: false,
    sort_order: 2,
    created_at: null,
    updated_at: null,
  },
];

const bundlesListResponse = {
  items: mockBundles,
  total: mockBundles.length,
  page: 1,
  per_page: 20,
  pages: 1,
};

const manifestWithTokenBundles = {
  entities: [
    {
      entity_key: 'token_bundles',
      label: 'Token Bundles',
      cluster: 'settings',
      can_export: true,
      can_import: true,
      can_export_pii: false,
      supported_formats: ['json', 'csv'],
    },
  ],
};

function mockApiGet(manifest: unknown = manifestWithTokenBundles): void {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/settings') return Promise.resolve({ settings: {} });
    if (url === '/admin/token-bundles') return Promise.resolve(bundlesListResponse);
    if (url === '/admin/data-exchange/manifest') return Promise.resolve(manifest);
    return Promise.resolve({});
  });
}

async function mountOnTokensTab() {
  const wrapper = mount(Settings);
  await flushPromises();
  await wrapper.find('[data-testid="tab-tokens"]').trigger('click');
  await flushPromises();
  return wrapper;
}

describe('Settings.vue — token bundles bulk delete', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
    });
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    vi.clearAllMocks();
    mockApiGet();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('selecting a bundle shows the bulk toolbar with the count', async () => {
    const wrapper = await mountOnTokensTab();

    expect(wrapper.find('[data-testid="bundles-bulk-toolbar"]').exists()).toBe(false);

    await wrapper.find('[data-testid="select-bundle-tb-1"]').setValue(true);
    await flushPromises();

    expect(wrapper.find('[data-testid="bundles-bulk-toolbar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="bundles-bulk-selected-count"]').text()).toContain('1');
  });

  it('select-all selects every bundle', async () => {
    const wrapper = await mountOnTokensTab();

    await wrapper.find('[data-testid="select-all-bundles"]').setValue(true);
    await flushPromises();

    expect(wrapper.find('[data-testid="bundles-bulk-selected-count"]').text()).toContain('2');
  });

  it('bulk-delete calls the token-bundle delete endpoint per selected id, reloads, clears selection', async () => {
    vi.mocked(api.delete).mockResolvedValue({});
    const wrapper = await mountOnTokensTab();

    await wrapper.find('[data-testid="select-bundle-tb-1"]').setValue(true);
    await wrapper.find('[data-testid="select-bundle-tb-2"]').setValue(true);
    await flushPromises();

    await wrapper.find('[data-testid="bundles-bulk-delete-btn"]').trigger('click');
    await flushPromises();

    expect(api.delete).toHaveBeenCalledWith('/admin/token-bundles/tb-1');
    expect(api.delete).toHaveBeenCalledWith('/admin/token-bundles/tb-2');
    // list reloaded (fetched twice: initial + after bulk delete)
    const bundleFetches = vi.mocked(api.get).mock.calls.filter(
      (call) => call[0] === '/admin/token-bundles',
    );
    expect(bundleFetches.length).toBeGreaterThanOrEqual(2);
    // selection cleared → toolbar gone
    expect(wrapper.find('[data-testid="bundles-bulk-toolbar"]').exists()).toBe(false);
  });

  it('a failure on one id still deletes the others and surfaces the message', async () => {
    vi.mocked(api.delete).mockImplementation((url: string) => {
      if (url === '/admin/token-bundles/tb-1') {
        const error = new Error('Bundle has purchases') as Error & { status?: number };
        error.status = 409;
        return Promise.reject(error);
      }
      return Promise.resolve({});
    });

    const wrapper = await mountOnTokensTab();

    await wrapper.find('[data-testid="select-bundle-tb-1"]').setValue(true);
    await wrapper.find('[data-testid="select-bundle-tb-2"]').setValue(true);
    await flushPromises();

    await wrapper.find('[data-testid="bundles-bulk-delete-btn"]').trigger('click');
    await flushPromises();

    expect(api.delete).toHaveBeenCalledWith('/admin/token-bundles/tb-1');
    expect(api.delete).toHaveBeenCalledWith('/admin/token-bundles/tb-2');

    const message = wrapper.find('[data-testid="error-message"]').text();
    expect(message).toContain('Starter Pack');
  });
});

describe('Settings.vue — token bundles import/export', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
    });
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders ImportExportControls scoped to token_bundles with json+csv', async () => {
    mockApiGet();
    const wrapper = await mountOnTokensTab();

    expect(wrapper.find('[data-testid="token-bundles-import-export"]').exists()).toBe(true);
    // json + csv → the format select is shown
    expect(wrapper.find('[data-test="export-format"]').exists()).toBe(true);
  });

  it('export routes through POST /admin/data-exchange/token_bundles/export', async () => {
    mockApiGet();
    vi.mocked(api.post).mockResolvedValue(new Blob());
    const wrapper = await mountOnTokensTab();

    await wrapper.find('[data-test="export-all"]').trigger('click');
    await flushPromises();

    const exportCall = vi.mocked(api.post).mock.calls.find(
      (call) => call[0] === '/admin/data-exchange/token_bundles/export',
    );
    expect(exportCall).toBeTruthy();
  });

  it('is hidden when the manifest denies token_bundles', async () => {
    mockApiGet({ entities: [] });
    const wrapper = await mountOnTokensTab();

    expect(wrapper.find('[data-testid="token-bundles-import-export"]').exists()).toBe(false);
  });
});
