import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import LicenseTab from '@/views/settings/LicenseTab.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import type { LicenseStatusPayload } from '@/api/license';

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

function licensedPayload(overrides: Partial<LicenseStatusPayload> = {}): LicenseStatusPayload {
  return {
    configured: true,
    active: true,
    edition: 'community',
    seats: { used: null, limit: 25 },
    resources: [{ resource: 'seats', limit: 25, used: null }],
    features: [{ feature: 'marketplace', licensed: true }],
    keys: [
      {
        key_id: 'key-platform',
        scope: ['*'],
        status: 'VALID',
        customer: 'Acme GmbH',
        edition: 'community',
        expires_at: '2027-01-01T00:00:00+00:00',
        seat_limit: 25,
      },
      {
        key_id: 'key-mp',
        scope: ['marketplace'],
        status: 'VALID',
        customer: 'Acme GmbH',
        edition: null,
        expires_at: '2026-08-01T00:00:00+00:00',
        seat_limit: 0,
      },
    ],
    required: false,
    degraded: false,
    ...overrides,
  };
}

function emptyPayload(): LicenseStatusPayload {
  return {
    configured: false,
    active: true,
    edition: null,
    seats: { used: null, limit: null },
    resources: [],
    features: [],
    keys: [],
    required: false,
    degraded: false,
  };
}

function degradedPayload(): LicenseStatusPayload {
  return {
    configured: true,
    active: false,
    edition: null,
    seats: { used: null, limit: null },
    resources: [{ resource: 'seats', limit: null, used: null }],
    features: [],
    keys: [],
    required: true,
    degraded: true,
  };
}

function installGet(payload: LicenseStatusPayload): void {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/license') {
      return Promise.resolve(payload);
    }
    return Promise.resolve({});
  });
}

function mountReady() {
  const wrapper = mount(LicenseTab);
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
    user: { id: '2', email: 'viewer@test.com', role: 'ADMIN', permissions: ['license.view'] },
    token: 'view-token',
  });
}

describe('LicenseTab.vue (S135-CLIENT §2.5)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setSuperAdmin();
    vi.clearAllMocks();
    installGet(licensedPayload());
    vi.mocked(api.post).mockResolvedValue({ key_id: 'key-new', scope: ['*'], status: 'VALID' });
    vi.mocked(api.delete).mockResolvedValue({ removed: 'key-mp' });
  });

  describe('status card + resource usage', () => {
    it('fetches status on mount and renders the edition + overall badge', async () => {
      const wrapper = await mountReady();
      expect(api.get).toHaveBeenCalledWith('/admin/license');
      const card = wrapper.find('[data-testid="license-status-card"]');
      expect(card.exists()).toBe(true);
      expect(card.text()).toContain('community');
      expect(wrapper.find('[data-testid="license-overall-badge"]').text().toLowerCase()).toContain(
        'active',
      );
    });

    it('renders the global seat usage, showing an em dash for a null used count', async () => {
      const wrapper = await mountReady();
      const seats = wrapper.find('[data-testid="license-seats"]');
      expect(seats.text()).toContain('25');
      expect(seats.text()).toContain('—');
    });

    it('renders a resource row per reported resource', async () => {
      const wrapper = await mountReady();
      const rows = wrapper.findAll('[data-testid="license-resource-row"]');
      expect(rows).toHaveLength(1);
      expect(rows[0].text()).toContain('seats');
    });
  });

  describe('keys table', () => {
    it('renders one row per held key with scope, id, status and seats', async () => {
      const wrapper = await mountReady();
      const table = wrapper.find('[data-testid="license-keys-table"]');
      expect(table.exists()).toBe(true);
      expect(wrapper.find('[data-testid="license-key-row-key-platform"]').exists()).toBe(true);
      const mpRow = wrapper.find('[data-testid="license-key-row-key-mp"]');
      expect(mpRow.text()).toContain('marketplace');
      expect(mpRow.text()).toContain('key-mp');
      expect(mpRow.find('[data-testid="license-key-status-key-mp"]').text()).toContain('VALID');
    });

    it('renders no product/plugin names that are not present in the payload', async () => {
      const wrapper = await mountReady();
      // The tab is agnostic: it only shows scopes the backend reported.
      expect(wrapper.text()).not.toContain('pharma');
      expect(wrapper.text()).toContain('marketplace');
    });
  });

  describe('add key', () => {
    it('"Activate with code" posts the code and surfaces the returned status', async () => {
      const wrapper = await mountReady();
      vi.mocked(api.get).mockClear();
      await wrapper.find('[data-testid="license-code-input"]').setValue('DASH-CODE-123');
      await wrapper.find('[data-testid="license-code-submit"]').trigger('click');
      await flushPromises();
      expect(api.post).toHaveBeenCalledWith('/admin/license/keys', { code: 'DASH-CODE-123' });
      expect(api.get).toHaveBeenCalledWith('/admin/license');
      expect(wrapper.find('[data-testid="license-message"]').text()).toContain('VALID');
    });

    it('"Paste license file" posts the envelope and refetches', async () => {
      const wrapper = await mountReady();
      vi.mocked(api.get).mockClear();
      await wrapper.find('[data-testid="license-envelope-input"]').setValue('BASE64.ENVELOPE');
      await wrapper.find('[data-testid="license-envelope-submit"]').trigger('click');
      await flushPromises();
      expect(api.post).toHaveBeenCalledWith('/admin/license/keys', { envelope: 'BASE64.ENVELOPE' });
      expect(api.get).toHaveBeenCalledWith('/admin/license');
    });

    it('surfaces the failure reason when adding a key is rejected', async () => {
      const wrapper = await mountReady();
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Key rejected'));
      await wrapper.find('[data-testid="license-envelope-input"]').setValue('BAD.ENVELOPE');
      await wrapper.find('[data-testid="license-envelope-submit"]').trigger('click');
      await flushPromises();
      expect(wrapper.find('[data-testid="license-message"]').text()).toContain('Key rejected');
    });
  });

  describe('remove key', () => {
    it('confirmed remove calls DELETE and refetches', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountReady();
      vi.mocked(api.get).mockClear();
      await wrapper.find('[data-testid="license-remove-key-mp"]').trigger('click');
      await flushPromises();
      expect(api.delete).toHaveBeenCalledWith('/admin/license/keys/key-mp');
      expect(api.get).toHaveBeenCalledWith('/admin/license');
    });
  });

  describe('empty + degraded states', () => {
    it('renders a friendly empty state when no keys are held', async () => {
      installGet(emptyPayload());
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="license-empty"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="license-keys-table"]').exists()).toBe(false);
    });

    it('renders the degraded banner when licensing is required but uncovered', async () => {
      installGet(degradedPayload());
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="license-degraded-banner"]').exists()).toBe(true);
    });

    it('does not show the degraded banner in the open/default state', async () => {
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="license-degraded-banner"]').exists()).toBe(false);
    });
  });

  describe('permission gating', () => {
    it('hides add/remove controls without license.manage', async () => {
      setViewerOnly();
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="license-code-submit"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="license-envelope-submit"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="license-remove-key-mp"]').exists()).toBe(false);
      // Read-only viewer still sees the key rows.
      expect(wrapper.find('[data-testid="license-keys-table"]').text()).toContain('key-mp');
    });
  });
});
