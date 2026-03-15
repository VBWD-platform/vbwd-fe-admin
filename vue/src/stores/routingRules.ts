import { defineStore } from 'pinia';
import { api } from '../api';

export interface RoutingRule {
  id: string;
  name: string;
  is_active: boolean;
  priority: number;
  match_type: string;
  match_value: string | null;
  target_slug: string;
  redirect_code: 301 | 302;
  is_rewrite: boolean;
  layer: 'nginx' | 'middleware';
  created_at: string | null;
  updated_at: string | null;
}

export type RoutingRulePayload = Omit<RoutingRule, 'id' | 'created_at' | 'updated_at'>;

export const useRoutingRulesStore = defineStore('routingRules', {
  state: () => ({
    rules: [] as RoutingRule[],
    loading: false,
    error: '' as string,
    lastReloadAt: null as string | null,
  }),

  actions: {
    async fetchRules() {
      this.loading = true;
      this.error = '';
      try {
        const data = await api.get('/admin/cms/routing-rules') as RoutingRule[];
        this.rules = data;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to load routing rules';
      } finally {
        this.loading = false;
      }
    },

    async createRule(payload: RoutingRulePayload): Promise<RoutingRule> {
      const rule = await api.post('/admin/cms/routing-rules', payload) as RoutingRule;
      this.rules.push(rule);
      return rule;
    },

    async updateRule(id: string, payload: Partial<RoutingRulePayload>): Promise<RoutingRule> {
      const updated = await api.put(`/admin/cms/routing-rules/${id}`, payload) as RoutingRule;
      const idx = this.rules.findIndex((r) => r.id === id);
      if (idx !== -1) this.rules[idx] = updated;
      return updated;
    },

    async deleteRule(id: string): Promise<void> {
      await api.delete(`/admin/cms/routing-rules/${id}`);
      this.rules = this.rules.filter((r) => r.id !== id);
    },

    async reloadNginx(): Promise<{ reloaded: boolean; message: string }> {
      const result = await api.post('/admin/cms/routing-rules/reload', {}) as { reloaded: boolean; message: string };
      this.lastReloadAt = new Date().toISOString();
      return result;
    },
  },
});
