import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useApiKeysStore } from '@/stores/apiKeys';
import { api } from '@/api';

vi.mock('@/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn()
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn()
}));

describe('Admin ApiKeysStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initialises with empty state', () => {
    const store = useApiKeysStore();
    expect(store.keys).toEqual([]);
    expect(store.scopes).toEqual([]);
    expect(store.createdPlaintext).toBeNull();
  });

  it('fetches a target user keys from the admin endpoint', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      api_keys: [{ id: 'k1', label: 'x', key_prefix: 'vbwdk_a', scopes: [], ip_whitelist: [], is_active: true }],
    });
    const store = useApiKeysStore();
    await store.fetchKeys('user-1');
    expect(api.get).toHaveBeenCalledWith('/admin/users/user-1/api-keys');
    expect(store.keys).toHaveLength(1);
  });

  it('fetches the full scope catalogue (flattened) from the admin endpoint', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      scopes: {
        core: [],
        cms: [{ key: 'cms:posts:create', label: 'Create', user_grantable: true }],
      },
    });
    const store = useApiKeysStore();
    await store.fetchScopes();
    expect(api.get).toHaveBeenCalledWith('/admin/api-keys/scopes');
    expect(store.scopes.map((s) => s.key)).toContain('cms:posts:create');
  });

  it('creates a key for the target user and captures the one-time plaintext', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      api_key: { id: 'k2', label: 'CI', key_prefix: 'vbwdk_b', scopes: [], ip_whitelist: [], is_active: true, plaintext: 'vbwdk_secret' },
    });
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ api_keys: [] });
    const store = useApiKeysStore();
    await store.createKey('user-1', { label: 'CI', scopes: [], ipWhitelist: [] });
    expect(api.post).toHaveBeenCalledWith('/admin/users/user-1/api-keys', {
      label: 'CI',
      scopes: [],
      ip_whitelist: [],
    });
    expect(store.createdPlaintext).toBe('vbwdk_secret');
  });

  it('revokes a key via the admin endpoint then refreshes', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ api_keys: [] });
    const store = useApiKeysStore();
    await store.revokeKey('user-1', 'k1');
    expect(api.post).toHaveBeenCalledWith('/admin/api-keys/k1/revoke');
  });

  it('deletes a key via the admin endpoint then refreshes', async () => {
    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ api_keys: [] });
    const store = useApiKeysStore();
    await store.deleteKey('user-1', 'k1');
    expect(api.delete).toHaveBeenCalledWith('/admin/api-keys/k1');
  });

  it('clears the one-time plaintext', () => {
    const store = useApiKeysStore();
    store.createdPlaintext = 'x';
    store.dismissPlaintext();
    expect(store.createdPlaintext).toBeNull();
  });
});
