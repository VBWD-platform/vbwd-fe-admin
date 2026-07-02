<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  useWithdrawAdminStore,
  type WithdrawAction,
  type WithdrawRequestRow,
} from '../stores/withdrawAdmin';

const route = useRoute();
const router = useRouter();
const store = useWithdrawAdminStore();

const id = route.params.id as string;
const request = ref<WithdrawRequestRow | null>(null);
const sendAmount = ref('');
const notFound = ref(false);
const message = ref('');
const processing = ref(false);

const isPending = computed(() => request.value?.status === 'pending');
const isReopenable = computed(
  () => request.value?.status === 'rejected' || request.value?.status === 'failed',
);
const isDeletable = computed(() =>
  ['rejected', 'failed', 'completed'].includes(request.value?.status ?? ''),
);

function statusClass(status: string): string {
  if (status === 'completed') return 'completed';
  if (status === 'approved' || status === 'processing') return 'processing';
  if (status === 'pending') return 'pending';
  return 'rejected';
}

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function flash(text: string): void {
  message.value = text;
  setTimeout(() => {
    message.value = '';
  }, 3500);
}

async function load(): Promise<void> {
  const row = await store.fetchOne(id);
  if (!row) {
    notFound.value = true;
    return;
  }
  request.value = row;
  sendAmount.value = String(row.payout_amount ?? '');
}

/** Approve = send the (possibly edited) fiat amount to the user's account. */
async function send(): Promise<void> {
  if (!request.value) return;
  const amount = String(sendAmount.value).trim();
  if (
    !window.confirm(
      `Send ${amount} ${request.value.currency} to the user's ${request.value.provider} account?`,
    )
  ) {
    return;
  }
  processing.value = true;
  const ok = await store.act(id, 'approve', { payoutAmount: amount });
  processing.value = false;
  if (ok) {
    flash('Payout sent.');
    await load();
  }
}

async function doAction(action: Exclude<WithdrawAction, 'approve'>): Promise<void> {
  let reason: string | undefined;
  if (action === 'reject') {
    reason = window.prompt('Reason for rejection (optional):') ?? undefined;
  }
  if (action === 'delete' && !window.confirm('Delete this withdraw request?')) return;
  processing.value = true;
  const ok = await store.act(id, action, { reason });
  processing.value = false;
  if (!ok) return;
  if (action === 'delete') {
    router.push('/admin/marketplace/withdraw-requests');
    return;
  }
  flash(action === 'reject' ? 'Request rejected.' : 'Request reopened.');
  await load();
}

onMounted(load);
</script>

<template>
  <div
    class="wr-detail"
    data-testid="wr-detail-view"
  >
    <router-link
      class="back-link"
      to="/admin/marketplace/withdraw-requests"
    >
      ← {{ $t('marketplace.withdraw.detail.back') }}
    </router-link>

    <div class="wr-detail-header">
      <h2>{{ $t('marketplace.withdraw.detail.title') }}</h2>
      <span
        v-if="request"
        class="status-badge"
        :class="statusClass(request.status)"
        data-testid="wr-detail-status"
      >{{ request.status }}</span>
    </div>

    <div
      v-if="message"
      class="wr-message"
      data-testid="wr-detail-message"
    >
      {{ message }}
    </div>
    <div
      v-if="store.error"
      class="wr-message error"
      data-testid="wr-detail-error"
    >
      {{ store.error }}
    </div>

    <div
      v-if="store.loading && !request"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('marketplace.withdraw.loading') }}</p>
    </div>

    <div
      v-else-if="notFound"
      class="empty-state"
      data-testid="wr-detail-not-found"
    >
      <p>{{ $t('marketplace.withdraw.detail.notFound') }}</p>
    </div>

    <template v-else-if="request">
      <!-- Send / payout action card -->
      <div
        class="action-card"
        data-testid="wr-detail-actions"
      >
        <div class="form-group">
          <label>{{ $t('marketplace.withdraw.detail.amountToSend') }}</label>
          <div class="amount-row">
            <input
              v-model="sendAmount"
              type="number"
              step="0.01"
              min="0"
              class="form-input amount-input"
              :disabled="!isPending || processing"
              data-testid="wr-detail-amount"
            >
            <span class="currency">{{ request.currency }}</span>
          </div>
          <p class="hint">
            {{ $t('marketplace.withdraw.detail.amountHint') }}
          </p>
        </div>

        <div class="action-buttons">
          <button
            class="btn send-btn"
            :disabled="!isPending || processing || !sendAmount"
            data-testid="wr-detail-send"
            @click="send"
          >
            {{ $t('marketplace.withdraw.detail.send', { amount: sendAmount, currency: request.currency }) }}
          </button>
          <button
            v-if="isPending"
            class="btn reject-btn"
            :disabled="processing"
            data-testid="wr-detail-reject"
            @click="doAction('reject')"
          >
            {{ $t('marketplace.withdraw.actions.reject') }}
          </button>
          <button
            v-if="isReopenable"
            class="btn pending-btn"
            :disabled="processing"
            data-testid="wr-detail-pending"
            @click="doAction('pending')"
          >
            {{ $t('marketplace.withdraw.actions.pending') }}
          </button>
          <button
            v-if="isDeletable"
            class="btn delete-btn"
            :disabled="processing"
            data-testid="wr-detail-delete"
            @click="doAction('delete')"
          >
            {{ $t('marketplace.withdraw.actions.delete') }}
          </button>
        </div>
      </div>

      <!-- Detail fields -->
      <dl class="wr-detail-fields">
        <dt>{{ $t('marketplace.withdraw.detail.id') }}</dt>
        <dd
          class="mono"
          data-testid="wr-detail-id"
        >
          {{ request.id }}
        </dd>

        <dt>{{ $t('marketplace.withdraw.table.user') }}</dt>
        <dd
          class="mono"
          data-testid="wr-detail-user"
        >
          {{ request.user_id }}
        </dd>

        <dt>{{ $t('marketplace.withdraw.table.provider') }}</dt>
        <dd>{{ request.provider }}</dd>

        <dt>{{ $t('marketplace.withdraw.detail.balanceSource') }}</dt>
        <dd>{{ request.balance_source }}</dd>

        <dt>{{ $t('marketplace.withdraw.detail.amountTokens') }}</dt>
        <dd>{{ request.amount }}</dd>

        <dt>{{ $t('marketplace.withdraw.detail.requestedPayout') }}</dt>
        <dd>{{ request.payout_amount }} {{ request.currency }}</dd>

        <dt>{{ $t('marketplace.withdraw.detail.destination') }}</dt>
        <dd>
          <span
            v-for="(fieldValue, fieldName) in request.destination"
            :key="fieldName"
            class="dest-field"
          >{{ fieldName }}: {{ fieldValue }}</span>
        </dd>

        <template v-if="request.provider_payout_id">
          <dt>{{ $t('marketplace.withdraw.detail.payoutId') }}</dt>
          <dd class="mono">
            {{ request.provider_payout_id }}
          </dd>
        </template>

        <template v-if="request.error">
          <dt>{{ $t('marketplace.withdraw.detail.error') }}</dt>
          <dd
            class="err"
            data-testid="wr-detail-err"
          >
            {{ request.error }}
          </dd>
        </template>

        <dt>{{ $t('marketplace.withdraw.table.created') }}</dt>
        <dd>{{ formatDate(request.created_at) }}</dd>

        <dt>{{ $t('marketplace.withdraw.detail.updated') }}</dt>
        <dd>{{ formatDate(request.updated_at) }}</dd>
      </dl>
    </template>
  </div>
</template>

<style scoped>
.wr-detail { background: white; padding: 20px; border-radius: 8px; }
.back-link { display: inline-block; margin-bottom: 15px; color: #3498db; text-decoration: none; font-size: 0.9rem; }
.back-link:hover { text-decoration: underline; }
.wr-detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.wr-detail-header h2 { margin: 0; color: #2c3e50; }

.wr-message { padding: 12px 15px; border-radius: 4px; margin-bottom: 15px; font-weight: 500; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.wr-message.error { background: #f8d7da; color: #721c24; border-color: #f5c6cb; }

.loading-state, .empty-state { text-align: center; padding: 40px; color: #666; }
.empty-state { background: #f8f9fa; border-radius: 8px; }
.spinner { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.action-card { border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #f8fbff; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 8px; color: #666; font-size: 0.9rem; font-weight: 600; }
.amount-row { display: flex; align-items: center; gap: 10px; }
.form-input { padding: 10px 15px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.form-input:focus { outline: none; border-color: #3498db; }
.form-input:disabled { background: #f1f1f1; color: #888; }
.amount-input { width: 220px; }
.currency { font-weight: 600; color: #2c3e50; }
.hint { margin: 6px 0 0; color: #888; font-size: 0.82rem; }

.action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.btn { padding: 10px 18px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.send-btn { background: #28a745; color: #fff; }
.send-btn:hover:not(:disabled) { background: #218838; }
.reject-btn { background: #ffe5d0; color: #9c4221; }
.pending-btn { background: #fff3cd; color: #856404; }
.delete-btn { background: #f8d7da; color: #721c24; }

.wr-detail-fields { margin: 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
.wr-detail-fields dt { padding: 12px 15px; background: #f8f9fa; color: #666; font-size: 0.85rem; font-weight: 600; border-bottom: 1px solid #eee; }
.wr-detail-fields dd { margin: 0; padding: 12px 15px; color: #2c3e50; border-bottom: 1px solid #eee; word-break: break-word; }
@media (min-width: 640px) {
  .wr-detail-fields { display: grid; grid-template-columns: 220px 1fr; }
  .wr-detail-fields dt { border-right: 1px solid #eee; }
}
.wr-detail-fields dt:last-of-type, .wr-detail-fields dd:last-of-type { border-bottom: none; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 13px; }
.dest-field { display: block; }
.err { color: #dc2626; }

.status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 500; text-transform: capitalize; }
.status-badge.completed { background: #d4edda; color: #155724; }
.status-badge.processing { background: #cfe2ff; color: #0a58ca; }
.status-badge.pending { background: #fff3cd; color: #856404; }
.status-badge.rejected { background: #f8d7da; color: #721c24; }
</style>
