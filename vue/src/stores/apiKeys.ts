/**
 * Admin API-key store (S52).
 *
 * Backs the native "API" tab on the User edit page. An admin manages ANY
 * user's keys via the core admin endpoints. Wires the shared fe-core
 * ApiKeysManager component's events to the `api` singleton (DRY: the user app
 * uses an identical store against its own self-service endpoints).
 */
import { defineStore } from 'pinia';
import { api } from '../api';
import type { ApiKey, ApiScope } from 'vbwd-view-component';

interface ScopeCatalogue {
  [source: string]: ApiScope[];
}

function flattenScopes(catalogue: ScopeCatalogue): ApiScope[] {
  const scopes: ApiScope[] = [];
  for (const source of Object.keys(catalogue)) {
    for (const scope of catalogue[source] || []) {
      scopes.push(scope);
    }
  }
  return scopes;
}

export const useApiKeysStore = defineStore('apiKeys', {
  state: () => ({
    keys: [] as ApiKey[],
    scopes: [] as ApiScope[],
    createdPlaintext: null as string | null,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchKeys(userId: string): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const response = (await api.get(`/admin/users/${userId}/api-keys`)) as {
          api_keys: ApiKey[];
        };
        this.keys = response.api_keys;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to load API keys';
      } finally {
        this.loading = false;
      }
    },

    async fetchScopes(): Promise<void> {
      try {
        const response = (await api.get('/admin/api-keys/scopes')) as {
          scopes: ScopeCatalogue;
        };
        this.scopes = flattenScopes(response.scopes);
      } catch (error) {
        this.error = (error as Error).message || 'Failed to load scopes';
      }
    },

    async createKey(
      userId: string,
      payload: { label: string; scopes: string[]; ipWhitelist: string[] },
    ): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const response = (await api.post(`/admin/users/${userId}/api-keys`, {
          label: payload.label,
          scopes: payload.scopes,
          ip_whitelist: payload.ipWhitelist,
        })) as { api_key: ApiKey & { plaintext: string } };
        this.createdPlaintext = response.api_key.plaintext;
        await this.fetchKeys(userId);
      } catch (error) {
        this.error = (error as Error).message || 'Failed to create API key';
      } finally {
        this.loading = false;
      }
    },

    async revokeKey(userId: string, keyId: string): Promise<void> {
      await api.post(`/admin/api-keys/${keyId}/revoke`);
      await this.fetchKeys(userId);
    },

    async deleteKey(userId: string, keyId: string): Promise<void> {
      await api.delete(`/admin/api-keys/${keyId}`);
      await this.fetchKeys(userId);
    },

    dismissPlaintext(): void {
      this.createdPlaintext = null;
    },
  },
});
