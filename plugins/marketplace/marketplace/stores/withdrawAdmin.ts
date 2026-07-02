import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api';

export interface WithdrawRequestRow {
  id: string;
  user_id: string;
  balance_source: string;
  amount: number;
  payout_amount: string;
  currency: string;
  provider: string;
  destination: Record<string, string>;
  status: string;
  provider_payout_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export type WithdrawAction = 'approve' | 'reject' | 'pending' | 'delete';

export interface ActOptions {
  reason?: string;
  /** Approve only: override the fiat payout amount sent to the user. */
  payoutAmount?: string;
}

/**
 * withdraw-admin store — moderation of withdraw requests.
 *
 * Talks to the `withdraw` backend plugin's admin routes
 * (GET /admin/withdraw/requests, POST …/<id>/{approve,reject,pending},
 * DELETE …/<id>). The admin JWT is auto-attached by the shared ApiClient.
 * Per-row actions return true/false so the view can drive bulk loops and
 * report partial failures.
 */
export const useWithdrawAdminStore = defineStore('withdrawAdmin', () => {
  const requests = ref<WithdrawRequestRow[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function normalize(response: unknown): WithdrawRequestRow[] {
    if (Array.isArray(response)) return response as WithdrawRequestRow[];
    const body = response as { requests?: WithdrawRequestRow[] } | null;
    return body?.requests ?? [];
  }

  async function fetchRequests(status?: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      requests.value = normalize(await api.get(`/admin/withdraw/requests${query}`));
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught);
    } finally {
      loading.value = false;
    }
  }

  /** Fetch a single request for the admin detail page. */
  async function fetchOne(id: string): Promise<WithdrawRequestRow | null> {
    loading.value = true;
    error.value = null;
    try {
      const response = (await api.get(`/admin/withdraw/requests/${id}`)) as {
        request?: WithdrawRequestRow;
      } | null;
      return response?.request ?? null;
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught);
      return null;
    } finally {
      loading.value = false;
    }
  }

  function applyUpdated(updated: WithdrawRequestRow | undefined): void {
    if (!updated || !updated.id) return;
    const index = requests.value.findIndex((row) => row.id === updated.id);
    if (index !== -1) requests.value.splice(index, 1, updated);
  }

  /** Apply one action to one request. Returns true on success. */
  async function act(
    id: string,
    action: WithdrawAction,
    opts: ActOptions = {},
  ): Promise<boolean> {
    try {
      if (action === 'delete') {
        await api.delete(`/admin/withdraw/requests/${id}`);
        requests.value = requests.value.filter((row) => row.id !== id);
        return true;
      }
      let body: Record<string, unknown> = {};
      if (action === 'reject') body = { reason: opts.reason ?? null };
      else if (action === 'approve' && opts.payoutAmount != null && opts.payoutAmount !== '') {
        body = { payout_amount: opts.payoutAmount };
      }
      const response = (await api.post(
        `/admin/withdraw/requests/${id}/${action}`,
        body,
      )) as { request?: WithdrawRequestRow } | null;
      applyUpdated(response?.request);
      return true;
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught);
      return false;
    }
  }

  return { requests, loading, error, fetchRequests, fetchOne, act };
});
