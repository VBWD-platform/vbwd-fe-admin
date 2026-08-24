import { defineStore } from 'pinia';
import { api } from '../api';

/**
 * LLM connection row as returned by `GET /api/v1/admin/llm-connections` (S97).
 *
 * `api_key` is ALREADY masked server-side (first 16 chars then an ellipsis); the
 * admin app renders it as-is and never receives or shows a full key.
 */
export interface LlmConnection {
  id: string;
  slug: string;
  connection_name: string;
  api_endpoint: string | null;
  api_key: string | null;
  model: string;
  provider: string | null;
  temperature: number | null;
  max_tokens: number | null;
  timeout: number | null;
  is_active: boolean;
  is_default: boolean;
  last_active_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface LlmConnectionsResponse {
  connections: LlmConnection[];
  total: number;
  page: number;
  page_size: number;
}

interface LlmConnectionResponse {
  connection: LlmConnection;
}

/** Writable fields for `POST` (create) and `PUT` (update). */
export interface LlmConnectionPayload {
  connection_name: string;
  slug: string;
  model: string;
  api_endpoint: string;
  api_key?: string;
  is_active: boolean;
}

export const useLlmConnectionsStore = defineStore('llmConnections', {
  state: () => ({
    connections: [] as LlmConnection[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchConnections(): Promise<LlmConnection[]> {
      this.loading = true;
      this.error = null;
      try {
        const response = (await api.get('/admin/llm-connections')) as LlmConnectionsResponse;
        this.connections = response.connections;
        return response.connections;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch LLM connections';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createConnection(payload: LlmConnectionPayload): Promise<LlmConnection> {
      const response = (await api.post('/admin/llm-connections', payload)) as LlmConnectionResponse;
      await this.fetchConnections();
      return response.connection;
    },

    async testConnection(
      payload: LlmConnectionPayload,
    ): Promise<{ ok: boolean; message?: string; sample?: string; error?: string }> {
      return (await api.post('/admin/llm-connections/test', payload)) as {
        ok: boolean;
        message?: string;
        sample?: string;
        error?: string;
      };
    },

    async updateConnection(
      connectionId: string,
      payload: LlmConnectionPayload,
    ): Promise<LlmConnection> {
      const response = (await api.put(
        `/admin/llm-connections/${connectionId}`,
        payload,
      )) as LlmConnectionResponse;
      await this.fetchConnections();
      return response.connection;
    },

    async deleteConnection(connectionId: string): Promise<LlmConnection[]> {
      await api.delete(`/admin/llm-connections/${connectionId}`);
      return this.fetchConnections();
    },

    async makeDefault(connectionId: string): Promise<LlmConnection[]> {
      await api.post(`/admin/llm-connections/${connectionId}/make-default`);
      return this.fetchConnections();
    },

    async bulkSetActive(connectionIds: string[], active: boolean): Promise<LlmConnection[]> {
      await api.post('/admin/llm-connections/bulk-activate', { ids: connectionIds, active });
      return this.fetchConnections();
    },

    async bulkDelete(connectionIds: string[]): Promise<LlmConnection[]> {
      await api.post('/admin/llm-connections/bulk-delete', { ids: connectionIds });
      return this.fetchConnections();
    },

    reset(): void {
      this.connections = [];
      this.error = null;
      this.loading = false;
    },
  },
});
