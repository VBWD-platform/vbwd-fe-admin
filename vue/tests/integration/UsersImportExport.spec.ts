/**
 * S46.4 — Per-list Import/Export controls on Users (R12 + selectedIds wiring).
 *
 * Users renders `ImportExportControls` with entityKey="users", fed by the
 * existing row selection, with `can_*` derived from the data-exchange manifest.
 * R12: when the manifest grants no users capabilities, the control is hidden.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { defineComponent, ref } from 'vue';
import Users from '@/views/Users.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

vi.mock('@/api', () => ({
  api: { post: vi.fn(), get: vi.fn(), put: vi.fn(), delete: vi.fn(), setToken: vi.fn(), clearToken: vi.fn() },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn(),
}));

const capabilities = ref<Record<string, { can_export: boolean; can_import: boolean; can_export_pii: boolean; supported_formats: string[] }>>({});
const load = vi.fn().mockResolvedValue(undefined);

vi.mock('@/composables/useDataExchangeManifest', () => ({
  useDataExchangeManifest: () => ({
    load,
    capabilitiesFor: (key: string) =>
      capabilities.value[key] ?? { can_export: false, can_import: false, can_export_pii: false, supported_formats: ['json'] },
  }),
}));

const ControlsStub = defineComponent({
  name: 'ImportExportControls',
  props: ['api', 'entityKey', 'selectedIds', 'filterState', 'canExport', 'canImport', 'canExportPii', 'isSuperadmin', 'supportedFormats'],
  emits: ['refresh'],
  template: '<div data-testid="iec-stub" />',
});

const mockUsers = [
  { id: '1', email: 'u1@test.com', name: 'U1', is_active: true, role: 'USER', created_at: '2025-01-01' },
  { id: '2', email: 'u2@test.com', name: 'U2', is_active: true, role: 'USER', created_at: '2025-01-02' },
];

function mountUsers() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/admin/users' },
      { path: '/admin/users', name: 'users', component: Users },
      { path: '/admin/users/:id/edit', name: 'user-edit', component: { template: '<div />' } },
    ],
  });
  return mount(Users, {
    global: { plugins: [router], stubs: { ImportExportControls: ControlsStub } },
  });
}

describe('Users → ImportExportControls (S46.4)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {}, clearToken: () => {} } as never,
    });
    useAuthStore().$patch({
      user: { id: '9', email: 'a@test.com', role: 'ADMIN', permissions: ['users.export', 'users.import'] },
      token: 't',
    });
    vi.clearAllMocks();
    capabilities.value = {};
    vi.mocked(api.get).mockResolvedValue({ users: mockUsers, total: 2, page: 1, per_page: 20 });
  });

  it('renders the control with entityKey="users" and manifest-derived can_*', async () => {
    capabilities.value = {
      users: { can_export: true, can_import: true, can_export_pii: false, supported_formats: ['json', 'csv'] },
    };
    const wrapper = mountUsers();
    await flushPromises();

    const control = wrapper.findComponent(ControlsStub);
    expect(control.exists()).toBe(true);
    expect(control.props('entityKey')).toBe('users');
    expect(control.props('canExport')).toBe(true);
    expect(control.props('canImport')).toBe(true);
    expect(control.props('canExportPii')).toBe(false);
    expect(control.props('supportedFormats')).toEqual(['json', 'csv']);
  });

  it('feeds the current row selection into selectedIds', async () => {
    capabilities.value = {
      users: { can_export: true, can_import: false, can_export_pii: false, supported_formats: ['json'] },
    };
    const wrapper = mountUsers();
    await flushPromises();

    await wrapper.find('[data-testid="select-user-1"]').setValue(true);
    await flushPromises();

    expect(wrapper.findComponent(ControlsStub).props('selectedIds')).toEqual(['1']);
  });

  it('R12: hides the control when the manifest grants no users capabilities', async () => {
    capabilities.value = {
      users: { can_export: false, can_import: false, can_export_pii: false, supported_formats: ['json'] },
    };
    const wrapper = mountUsers();
    await flushPromises();

    expect(wrapper.findComponent(ControlsStub).exists()).toBe(false);
  });
});
