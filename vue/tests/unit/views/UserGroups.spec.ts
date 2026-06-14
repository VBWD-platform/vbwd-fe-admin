/**
 * S73 — UserGroups settings page: list (search/sort), bulk select + delete, and
 * the embedded ImportExportControls for the ``user_groups`` entity.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, getActivePinia } from 'pinia';
import UserGroups from '@/views/UserGroups.vue';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: vi.fn(),
    delete: (...args: unknown[]) => mockDelete(...args),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

vi.mock('@/composables/useDataExchangeManifest', () => ({
  useDataExchangeManifest: () => ({
    load: vi.fn(),
    capabilitiesFor: () => ({
      can_export: true,
      can_import: true,
      can_export_pii: false,
      supported_formats: ['json', 'csv'],
    }),
  }),
}));

vi.mock('@/api/dataExchangeApi', () => ({
  createDataExchangeApi: () => ({}),
}));

const groups = [
  { id: 'g1', slug: 'vip', name: 'VIP', lang: 'en', parent_group: null },
  { id: 'g2', slug: 'trial', name: 'Trial', lang: 'en', parent_group: 'vip' },
];

function mountComponent() {
  return mount(UserGroups, {
    global: {
      plugins: [getActivePinia()!],
      stubs: {
        ImportExportControls: { template: '<div data-testid="import-export-stub" />' },
      },
      mocks: { $t: (key: string) => key },
    },
  });
}

describe('UserGroups view (S73)', () => {
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
    mockGet.mockResolvedValue({ groups });
    mockPost.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
  });

  it('renders the list of user groups', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-testid="user-groups-table"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('vip');
    expect(wrapper.text()).toContain('Trial');
  });

  it('renders the import/export controls', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    expect(wrapper.find('[data-testid="import-export-stub"]').exists()).toBe(true);
  });

  it('filters groups by the search box', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.find('[data-testid="user-groups-search"]').setValue('trial');
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(wrapper.text()).toContain('Trial');
  });

  it('bulk-deletes selected groups via the bulk-delete endpoint', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const wrapper = mountComponent();
    await flushPromises();

    // Select all rows via the header checkbox.
    await wrapper.find('thead input[type="checkbox"]').trigger('change');
    await flushPromises();

    expect(wrapper.find('[data-testid="bulk-delete-btn"]').exists()).toBe(true);
    await wrapper.find('[data-testid="bulk-delete-btn"]').trigger('click');
    await flushPromises();

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toBe('/admin/user-groups/bulk-delete');
    expect((body as { ids: string[] }).ids.sort()).toEqual(['g1', 'g2']);
  });

  it('creates a group through the form', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.find('[data-testid="new-user-group-btn"]').trigger('click');
    await wrapper.find('[data-testid="form-slug"]').setValue('staff');
    await wrapper.find('[data-testid="form-name"]').setValue('Staff');
    await wrapper.find('[data-testid="form-save"]').trigger('click');
    await flushPromises();

    expect(mockPost).toHaveBeenCalledWith('/admin/user-groups', {
      slug: 'staff',
      name: 'Staff',
      lang: null,
      parent_group: null,
    });
  });
});
