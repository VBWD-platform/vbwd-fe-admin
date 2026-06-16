import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { ImportExportControls } from 'vbwd-view-component';
import LlmConnectionsTab from '@/views/llm-connections/LlmConnectionsTab.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import type { LlmConnection } from '@/stores/llmConnections';

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

// The backend already masks the key (first 16 chars then an ellipsis). The FE
// renders that value as-is and must never receive/show a full key.
const ANTHROPIC_MASKED = 'sk-ant-api03-abc…';
const OPENAI_MASKED = 'sk-proj-0123456…';

function makeConnection(overrides: Partial<LlmConnection>): LlmConnection {
  return {
    id: 'conn-1',
    slug: 'anthropic-default',
    connection_name: 'Anthropic Default',
    api_endpoint: 'https://api.anthropic.com',
    api_key: ANTHROPIC_MASKED,
    model: 'claude-3-5-sonnet',
    provider: 'anthropic',
    temperature: null,
    max_tokens: null,
    timeout: null,
    is_active: true,
    is_default: true,
    last_active_at: '2026-06-15T10:00:00+00:00',
    created_at: '2026-06-01T00:00:00+00:00',
    updated_at: '2026-06-15T10:00:00+00:00',
    ...overrides,
  };
}

function defaultCatalog(): LlmConnection[] {
  return [
    makeConnection({
      id: 'conn-1',
      slug: 'anthropic-default',
      connection_name: 'Anthropic Default',
      model: 'claude-3-5-sonnet',
      api_key: ANTHROPIC_MASKED,
      is_active: true,
      is_default: true,
    }),
    makeConnection({
      id: 'conn-2',
      slug: 'openai-mini',
      connection_name: 'OpenAI Mini',
      api_endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      provider: 'openai',
      api_key: OPENAI_MASKED,
      is_active: false,
      is_default: false,
      last_active_at: null,
    }),
  ];
}

function installApiMocks(catalog: LlmConnection[]): void {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/llm-connections') {
      return Promise.resolve({
        connections: catalog,
        total: catalog.length,
        page: 1,
        page_size: 25,
      });
    }
    if (url === '/admin/data-exchange/manifest') {
      return Promise.resolve({
        entities: [
          {
            entity_key: 'llm_connections',
            can_export: true,
            can_import: true,
            can_export_pii: false,
            supported_formats: ['json', 'csv'],
          },
        ],
      });
    }
    return Promise.resolve({});
  });
  vi.mocked(api.post).mockImplementation((url: string) => {
    if (url === '/admin/llm-connections') {
      return Promise.resolve({
        connection: makeConnection({
          id: 'conn-3',
          slug: 'new-conn',
          connection_name: 'New Connection',
          is_active: true,
          is_default: false,
        }),
      });
    }
    return Promise.resolve({ connection: catalog[0] });
  });
  vi.mocked(api.put).mockResolvedValue({ connection: catalog[0] });
  vi.mocked(api.delete).mockResolvedValue({ status: 'deleted' });
}

function mountReady() {
  const wrapper = mount(LlmConnectionsTab);
  return flushPromises().then(() => wrapper);
}

function setSuperAdmin(): void {
  configureAuthStore({
    storageKey: 'test_token',
    apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
  });
  const authStore = useAuthStore();
  authStore.$patch({
    user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
    token: 'test-token',
  });
}

function setViewerOnly(): void {
  configureAuthStore({
    storageKey: 'test_token',
    apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
  });
  const authStore = useAuthStore();
  authStore.$patch({
    user: {
      id: '2',
      email: 'viewer@test.com',
      role: 'ADMIN',
      permissions: ['llm.connections.view'],
    },
    token: 'view-token',
  });
}

describe('LlmConnectionsTab.vue (S97.3)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setSuperAdmin();
    vi.clearAllMocks();
    installApiMocks(defaultCatalog());
  });

  describe('rendering', () => {
    it('lists connections from the API', async () => {
      const wrapper = await mountReady();
      expect(api.get).toHaveBeenCalledWith('/admin/llm-connections');
      const table = wrapper.find('[data-testid="llm-connections-table"]');
      expect(table.text()).toContain('Anthropic Default');
      expect(table.text()).toContain('OpenAI Mini');
    });

    it('renders the masked api_key as-is and never a full key', async () => {
      const wrapper = await mountReady();
      const keyCell = wrapper.find('[data-testid="llm-connection-key-conn-1"]');
      expect(keyCell.text()).toBe(ANTHROPIC_MASKED);
      // No raw secret leaks into the rendered output.
      expect(wrapper.text()).not.toContain('sk-ant-api03-abcdefghijklmnop');
    });

    it('shows active/inactive and a default badge', async () => {
      const wrapper = await mountReady();
      const defaultRow = wrapper.find('[data-testid="llm-connection-row-conn-1"]');
      expect(defaultRow.find('[data-testid="llm-connection-default-badge"]').exists()).toBe(true);
      expect(defaultRow.text()).toContain('Active');
      const otherRow = wrapper.find('[data-testid="llm-connection-row-conn-2"]');
      expect(otherRow.find('[data-testid="llm-connection-default-badge"]').exists()).toBe(false);
      expect(otherRow.text()).toContain('Inactive');
    });
  });

  describe('quicksearch + sort', () => {
    it('quicksearch filters the table', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="llm-connection-search"]').setValue('openai');
      const table = wrapper.find('[data-testid="llm-connections-table"]');
      expect(table.text()).toContain('OpenAI Mini');
      expect(table.text()).not.toContain('Anthropic Default');
    });

    it('sorting by connection_name reorders the rows', async () => {
      const wrapper = await mountReady();
      // Default order is API order (Anthropic, OpenAI). Click the name header to
      // sort ascending then descending and assert the first row flips.
      await wrapper.find('[data-testid="llm-sort-connection_name"]').trigger('click');
      let rows = wrapper.findAll('[data-testid^="llm-connection-row-"]');
      expect(rows[0].text()).toContain('Anthropic Default');
      await wrapper.find('[data-testid="llm-sort-connection_name"]').trigger('click');
      rows = wrapper.findAll('[data-testid^="llm-connection-row-"]');
      expect(rows[0].text()).toContain('OpenAI Mini');
    });
  });

  describe('make default', () => {
    it('calls make-default and re-renders the default badge', async () => {
      const wrapper = await mountReady();
      // conn-2 starts non-default; after make-default the list is refetched with
      // conn-2 as the active default.
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/admin/llm-connections') {
          return Promise.resolve({
            connections: [
              makeConnection({ id: 'conn-1', connection_name: 'Anthropic Default', is_default: false }),
              makeConnection({
                id: 'conn-2',
                connection_name: 'OpenAI Mini',
                is_active: true,
                is_default: true,
              }),
            ],
            total: 2,
            page: 1,
            page_size: 25,
          });
        }
        return Promise.resolve({});
      });
      await wrapper.find('[data-testid="llm-connection-make-default-conn-2"]').trigger('click');
      await flushPromises();
      expect(api.post).toHaveBeenCalledWith('/admin/llm-connections/conn-2/make-default');
      const newDefaultRow = wrapper.find('[data-testid="llm-connection-row-conn-2"]');
      expect(newDefaultRow.find('[data-testid="llm-connection-default-badge"]').exists()).toBe(true);
    });
  });

  describe('create connection', () => {
    it('the create form is hidden until the button is clicked', async () => {
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="llm-connection-new-slug"]').exists()).toBe(false);
      await wrapper.find('[data-testid="llm-connection-create-btn"]').trigger('click');
      expect(wrapper.find('[data-testid="llm-connection-new-name"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="llm-connection-new-slug"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="llm-connection-new-model"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="llm-connection-new-endpoint"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="llm-connection-new-key"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="llm-connection-new-active"]').exists()).toBe(true);
    });

    it('submitting the form POSTs the payload and refetches', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="llm-connection-create-btn"]').trigger('click');
      await wrapper.find('[data-testid="llm-connection-new-name"]').setValue('New Connection');
      await wrapper.find('[data-testid="llm-connection-new-slug"]').setValue('new-conn');
      await wrapper.find('[data-testid="llm-connection-new-model"]').setValue('gpt-4o-mini');
      await wrapper.find('[data-testid="llm-connection-new-endpoint"]').setValue('https://api.openai.com/v1');
      await wrapper.find('[data-testid="llm-connection-new-key"]').setValue('sk-secret-key-value');
      vi.mocked(api.get).mockClear();
      await wrapper.find('[data-testid="llm-connection-new-submit"]').trigger('click');
      await flushPromises();
      expect(api.post).toHaveBeenCalledWith('/admin/llm-connections', {
        connection_name: 'New Connection',
        slug: 'new-conn',
        model: 'gpt-4o-mini',
        api_endpoint: 'https://api.openai.com/v1',
        api_key: 'sk-secret-key-value',
        is_active: true,
      });
      expect(api.get).toHaveBeenCalledWith('/admin/llm-connections');
    });
  });

  describe('edit connection', () => {
    it('editing a row PUTs the writable fields and refetches', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="llm-connection-edit-conn-1"]').trigger('click');
      await wrapper.find('[data-testid="llm-connection-new-name"]').setValue('Anthropic Renamed');
      vi.mocked(api.get).mockClear();
      await wrapper.find('[data-testid="llm-connection-new-submit"]').trigger('click');
      await flushPromises();
      const putCall = vi
        .mocked(api.put)
        .mock.calls.find((entry) => entry[0] === '/admin/llm-connections/conn-1');
      expect(putCall).toBeTruthy();
      expect((putCall?.[1] as { connection_name: string }).connection_name).toBe('Anthropic Renamed');
      expect(api.get).toHaveBeenCalledWith('/admin/llm-connections');
    });
  });

  describe('delete connection', () => {
    it('confirmed delete calls DELETE and refetches', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountReady();
      vi.mocked(api.get).mockClear();
      await wrapper.find('[data-testid="llm-connection-delete-conn-1"]').trigger('click');
      await flushPromises();
      expect(api.delete).toHaveBeenCalledWith('/admin/llm-connections/conn-1');
      expect(api.get).toHaveBeenCalledWith('/admin/llm-connections');
    });
  });

  describe('bulk actions', () => {
    it('bulk activate calls /bulk-activate with active=true', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="llm-select-conn-2"]').setValue(true);
      await wrapper.find('[data-testid="llm-bulk-activate-btn"]').trigger('click');
      await flushPromises();
      expect(api.post).toHaveBeenCalledWith('/admin/llm-connections/bulk-activate', {
        ids: ['conn-2'],
        active: true,
      });
    });

    it('bulk deactivate calls /bulk-activate with active=false', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="llm-select-conn-1"]').setValue(true);
      await wrapper.find('[data-testid="llm-bulk-deactivate-btn"]').trigger('click');
      await flushPromises();
      expect(api.post).toHaveBeenCalledWith('/admin/llm-connections/bulk-activate', {
        ids: ['conn-1'],
        active: false,
      });
    });

    it('bulk delete calls /bulk-delete with the selected ids', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="llm-select-conn-1"]').setValue(true);
      await wrapper.find('[data-testid="llm-select-conn-2"]').setValue(true);
      await wrapper.find('[data-testid="llm-bulk-delete-btn"]').trigger('click');
      await flushPromises();
      expect(api.post).toHaveBeenCalledWith('/admin/llm-connections/bulk-delete', {
        ids: ['conn-1', 'conn-2'],
      });
    });
  });

  describe('import / export', () => {
    it('renders exactly one ImportExportControls scoped to llm_connections', async () => {
      const wrapper = await mountReady();
      const controls = wrapper.findAllComponents(ImportExportControls);
      expect(controls).toHaveLength(1);
      const props = controls[0].props() as Record<string, unknown>;
      expect(props.entityKey).toBe('llm_connections');
    });

    it('passes the selected ids to the export control', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="llm-select-conn-1"]').setValue(true);
      const controls = wrapper.findComponent(ImportExportControls);
      const props = controls.props() as Record<string, unknown>;
      expect(props.selectedIds).toEqual(['conn-1']);
    });
  });

  describe('permission gating', () => {
    it('hides write controls without llm.connections.manage', async () => {
      setViewerOnly();
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="llm-connection-create-btn"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="llm-connection-make-default-conn-2"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="llm-connection-edit-conn-1"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="llm-connection-delete-conn-1"]').exists()).toBe(false);
      // The read-only viewer still sees the rows.
      expect(wrapper.find('[data-testid="llm-connections-table"]').text()).toContain('Anthropic Default');
    });
  });
});
