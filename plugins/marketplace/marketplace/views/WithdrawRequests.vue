<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  useWithdrawAdminStore,
  type WithdrawAction,
  type WithdrawRequestRow,
} from '../stores/withdrawAdmin';

const store = useWithdrawAdminStore();
const router = useRouter();

function openDetail(row: WithdrawRequestRow): void {
  router.push(`/admin/marketplace/withdraw-requests/${row.id}`);
}

const searchQuery = ref('');
const statusFilter = ref('');
const message = ref('');
const processing = ref(false);
const selected = ref(new Set<string>());
const page = ref(1);
const perPage = 20;

type SortKey =
  | 'user_id'
  | 'provider'
  | 'amount'
  | 'payout_amount'
  | 'status'
  | 'created_at';
const sortColumn = ref<SortKey>('created_at');
const sortAsc = ref(false);

const STATUSES = [
  'pending',
  'approved',
  'processing',
  'completed',
  'failed',
  'rejected',
];

const filtered = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  let rows = store.requests.filter((row) => {
    if (statusFilter.value && row.status !== statusFilter.value) return false;
    if (query) {
      const hay = `${row.user_id} ${row.provider} ${row.id} ${row.status}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  rows = [...rows].sort((a, b) => {
    const dir = sortAsc.value ? 1 : -1;
    if (sortColumn.value === 'amount' || sortColumn.value === 'payout_amount') {
      return (Number(a[sortColumn.value]) - Number(b[sortColumn.value])) * dir;
    }
    return String(a[sortColumn.value]).localeCompare(String(b[sortColumn.value])) * dir;
  });
  return rows;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / perPage)),
);
const paged = computed(() => {
  const start = (page.value - 1) * perPage;
  return filtered.value.slice(start, start + perPage);
});

const allPageSelected = computed(
  () =>
    paged.value.length > 0 &&
    paged.value.every((row) => selected.value.has(row.id)),
);

function sortBy(key: SortKey): void {
  if (sortColumn.value === key) sortAsc.value = !sortAsc.value;
  else {
    sortColumn.value = key;
    sortAsc.value = true;
  }
}
function sortIndicator(key: SortKey): string {
  if (sortColumn.value !== key) return '';
  return sortAsc.value ? '▲' : '▼';
}

function toggleRow(id: string): void {
  if (selected.value.has(id)) selected.value.delete(id);
  else selected.value.add(id);
}
function toggleSelectAll(): void {
  if (allPageSelected.value) {
    paged.value.forEach((row) => selected.value.delete(row.id));
  } else {
    paged.value.forEach((row) => selected.value.add(row.id));
  }
}

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

async function reload(): Promise<void> {
  await store.fetchRequests();
}

/** Apply an action to a single row (per-row buttons). */
async function rowAction(row: WithdrawRequestRow, action: WithdrawAction): Promise<void> {
  let reason: string | undefined;
  if (action === 'reject') {
    reason = window.prompt('Reason for rejection (optional):') ?? undefined;
  }
  if (action === 'delete' && !window.confirm('Delete this withdraw request?')) return;
  processing.value = true;
  await store.act(row.id, action, { reason });
  processing.value = false;
}

async function bulk(action: WithdrawAction): Promise<void> {
  const ids = [...selected.value];
  if (ids.length === 0) return;
  let reason: string | undefined;
  if (action === 'reject') {
    reason = window.prompt(`Reason for rejecting ${ids.length} request(s) (optional):`) ?? undefined;
  }
  if (
    action === 'delete' &&
    !window.confirm(`Delete ${ids.length} withdraw request(s)? This cannot be undone.`)
  ) {
    return;
  }
  processing.value = true;
  let ok = 0;
  for (const id of ids) {
    if (await store.act(id, action, { reason })) ok += 1;
  }
  selected.value.clear();
  processing.value = false;
  const failed = ids.length - ok;
  flash(
    `${ok} ${action}${ok === 1 ? '' : 'ed'} · ${failed > 0 ? `${failed} skipped (invalid state)` : 'all applied'}`,
  );
  await reload();
}

onMounted(() => {
  reload();
});
</script>

<template>
  <div
    class="wr-view"
    data-testid="withdraw-requests-view"
  >
    <div class="wr-header">
      <div class="header-left">
        <h2>{{ $t('marketplace.withdraw.title') }}</h2>
        <span class="total-count">{{ filtered.length }} {{ $t('marketplace.withdraw.entries') }}</span>
      </div>
      <button
        class="refresh-btn"
        :disabled="store.loading"
        data-testid="wr-refresh"
        @click="reload"
      >
        {{ $t('marketplace.withdraw.refresh') }}
      </button>
    </div>

    <div class="wr-filters">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        data-testid="wr-search"
        :placeholder="$t('marketplace.withdraw.searchPlaceholder')"
      >
      <select
        v-model="statusFilter"
        class="filter-select"
        data-testid="wr-status-filter"
      >
        <option value="">
          {{ $t('marketplace.withdraw.allStatuses') }}
        </option>
        <option
          v-for="status in STATUSES"
          :key="status"
          :value="status"
        >
          {{ status }}
        </option>
      </select>
    </div>

    <div
      v-if="selected.size > 0"
      class="bulk-actions"
      data-testid="wr-bulk-actions"
    >
      <span class="selection-info">{{ $t('marketplace.withdraw.selected', { count: selected.size }) }}</span>
      <button
        class="bulk-btn approve"
        :disabled="processing"
        data-testid="wr-bulk-approve"
        @click="bulk('approve')"
      >
        {{ $t('marketplace.withdraw.actions.approve') }}
      </button>
      <button
        class="bulk-btn reject"
        :disabled="processing"
        data-testid="wr-bulk-reject"
        @click="bulk('reject')"
      >
        {{ $t('marketplace.withdraw.actions.reject') }}
      </button>
      <button
        class="bulk-btn pending"
        :disabled="processing"
        data-testid="wr-bulk-pending"
        @click="bulk('pending')"
      >
        {{ $t('marketplace.withdraw.actions.pending') }}
      </button>
      <button
        class="bulk-btn delete"
        :disabled="processing"
        data-testid="wr-bulk-delete"
        @click="bulk('delete')"
      >
        {{ $t('marketplace.withdraw.actions.delete') }}
      </button>
    </div>

    <div
      v-if="message"
      class="wr-message"
      data-testid="wr-message"
    >
      {{ message }}
    </div>
    <div
      v-if="store.error"
      class="wr-message error"
      data-testid="wr-error"
    >
      {{ store.error }}
    </div>

    <div
      v-if="store.loading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('marketplace.withdraw.loading') }}</p>
    </div>

    <div
      v-else-if="filtered.length === 0"
      class="empty-state"
      data-testid="wr-empty"
    >
      <p>{{ $t('marketplace.withdraw.empty') }}</p>
    </div>

    <div
      v-else
      class="wr-table-wrap"
    >
      <table
        class="wr-table"
        data-testid="wr-table"
      >
        <thead>
          <tr>
            <th class="checkbox-col">
              <input
                type="checkbox"
                :checked="allPageSelected"
                data-testid="wr-select-all"
                @change="toggleSelectAll"
              >
            </th>
            <th
              class="sortable"
              :class="{ sorted: sortColumn === 'user_id' }"
              @click="sortBy('user_id')"
            >
              {{ $t('marketplace.withdraw.table.user') }} <span class="sort-indicator">{{ sortIndicator('user_id') }}</span>
            </th>
            <th
              class="sortable"
              :class="{ sorted: sortColumn === 'provider' }"
              @click="sortBy('provider')"
            >
              {{ $t('marketplace.withdraw.table.provider') }} <span class="sort-indicator">{{ sortIndicator('provider') }}</span>
            </th>
            <th
              class="sortable"
              :class="{ sorted: sortColumn === 'amount' }"
              @click="sortBy('amount')"
            >
              {{ $t('marketplace.withdraw.table.amount') }} <span class="sort-indicator">{{ sortIndicator('amount') }}</span>
            </th>
            <th
              class="sortable"
              :class="{ sorted: sortColumn === 'payout_amount' }"
              @click="sortBy('payout_amount')"
            >
              {{ $t('marketplace.withdraw.table.payout') }} <span class="sort-indicator">{{ sortIndicator('payout_amount') }}</span>
            </th>
            <th
              class="sortable"
              :class="{ sorted: sortColumn === 'status' }"
              @click="sortBy('status')"
            >
              {{ $t('marketplace.withdraw.table.status') }} <span class="sort-indicator">{{ sortIndicator('status') }}</span>
            </th>
            <th
              class="sortable"
              :class="{ sorted: sortColumn === 'created_at' }"
              @click="sortBy('created_at')"
            >
              {{ $t('marketplace.withdraw.table.created') }} <span class="sort-indicator">{{ sortIndicator('created_at') }}</span>
            </th>
            <th>{{ $t('marketplace.withdraw.table.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in paged"
            :key="row.id"
            class="wr-row"
            :class="{ selected: selected.has(row.id) }"
            :data-testid="`wr-row-${row.id}`"
            @click="openDetail(row)"
          >
            <td
              class="checkbox-col"
              @click.stop
            >
              <input
                type="checkbox"
                :checked="selected.has(row.id)"
                @change="toggleRow(row.id)"
              >
            </td>
            <td
              class="mono"
              :title="row.user_id"
            >
              {{ row.user_id.slice(0, 8) }}…
            </td>
            <td>{{ row.provider }}</td>
            <td>{{ row.amount }}</td>
            <td>{{ row.payout_amount }} {{ row.currency }}</td>
            <td>
              <span
                class="status-badge"
                :class="statusClass(row.status)"
                data-testid="wr-row-status"
              >
                {{ row.status }}
              </span>
            </td>
            <td>{{ formatDate(row.created_at) }}</td>
            <td
              class="actions-col"
              @click.stop
            >
              <button
                class="action-btn approve-btn"
                :disabled="processing"
                title="Approve"
                @click="rowAction(row, 'approve')"
              >
                ✓
              </button>
              <button
                class="action-btn reject-btn"
                :disabled="processing"
                title="Reject"
                @click="rowAction(row, 'reject')"
              >
                ✕
              </button>
              <button
                class="action-btn pending-btn"
                :disabled="processing"
                title="Reopen (pending)"
                @click="rowAction(row, 'pending')"
              >
                ↺
              </button>
              <button
                class="action-btn delete-btn"
                :disabled="processing"
                title="Delete"
                @click="rowAction(row, 'delete')"
              >
                🗑
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="totalPages > 1"
        class="pagination"
        data-testid="wr-pagination"
      >
        <button
          class="pagination-btn"
          :disabled="page === 1"
          @click="page = Math.max(1, page - 1)"
        >
          {{ $t('marketplace.withdraw.prev') }}
        </button>
        <span class="pagination-info">{{ page }} / {{ totalPages }}</span>
        <button
          class="pagination-btn"
          :disabled="page >= totalPages"
          @click="page = Math.min(totalPages, page + 1)"
        >
          {{ $t('marketplace.withdraw.next') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wr-view { background: white; padding: 20px; border-radius: 8px; }
.wr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 15px; flex-wrap: wrap; }
.header-left { display: flex; align-items: center; gap: 12px; }
.wr-header h2 { margin: 0; color: #2c3e50; }
.total-count { color: #666; font-size: 0.9rem; }
.refresh-btn { padding: 8px 16px; background: #3498db; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
.refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.wr-filters { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 220px; padding: 10px 15px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.filter-select { padding: 10px 15px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; min-width: 180px; text-transform: capitalize; }

.bulk-actions { display: flex; gap: 10px; align-items: center; padding: 15px; margin-bottom: 20px; background: #f0f4f8; border-left: 4px solid #3498db; border-radius: 4px; flex-wrap: wrap; }
.selection-info { flex: 1; font-weight: 500; color: #2c3e50; }
.bulk-btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; }
.bulk-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.bulk-btn.approve { background: #d4edda; color: #155724; }
.bulk-btn.reject { background: #ffe5d0; color: #9c4221; }
.bulk-btn.pending { background: #fff3cd; color: #856404; }
.bulk-btn.delete { background: #f8d7da; color: #721c24; }

.wr-message { padding: 12px 15px; border-radius: 4px; margin-bottom: 15px; font-weight: 500; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.wr-message.error { background: #f8d7da; color: #721c24; border-color: #f5c6cb; }

.loading-state, .empty-state { text-align: center; padding: 40px; color: #666; }
.empty-state { background: #f8f9fa; border-radius: 8px; }
.spinner { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.wr-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.wr-table { width: 100%; border-collapse: collapse; }
.wr-table th, .wr-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
.wr-table th { background: #f8f9fa; font-weight: 600; color: #2c3e50; }
.wr-table th.sortable { cursor: pointer; user-select: none; }
.wr-table th.sortable:hover { background: #e9ecef; }
.wr-table th.sorted { background: #e3f2fd; }
.sort-indicator { font-size: 0.75rem; color: #3498db; }
.checkbox-col { width: 40px; text-align: center; }
.wr-row { cursor: pointer; }
.wr-row:hover { background: #f8f9fa; }
.wr-row.selected { background: #e3f2fd; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 13px; }

.status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 500; text-transform: capitalize; }
.status-badge.completed { background: #d4edda; color: #155724; }
.status-badge.processing { background: #cfe2ff; color: #0a58ca; }
.status-badge.pending { background: #fff3cd; color: #856404; }
.status-badge.rejected { background: #f8d7da; color: #721c24; }

.actions-col { white-space: nowrap; }
.action-btn { padding: 4px 9px; margin-right: 4px; border: 1px solid #d1d5db; background: #fff; border-radius: 4px; cursor: pointer; font-size: 13px; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.approve-btn { color: #155724; border-color: #c3e6cb; }
.approve-btn:hover:not(:disabled) { background: #d4edda; }
.reject-btn { color: #9c4221; border-color: #f5cba7; }
.reject-btn:hover:not(:disabled) { background: #ffe5d0; }
.pending-btn { color: #856404; border-color: #ffe08a; }
.pending-btn:hover:not(:disabled) { background: #fff3cd; }
.delete-btn { color: #721c24; border-color: #f5c6cb; }
.delete-btn:hover:not(:disabled) { background: #f8d7da; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
.pagination-btn { padding: 8px 16px; background: #3498db; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.pagination-btn:disabled { background: #ccc; cursor: not-allowed; }
.pagination-info { color: #666; font-size: 0.9rem; }

@media (max-width: 768px) {
  .wr-view { padding: 12px; border-radius: 0; }
  .wr-table { min-width: 720px; }
}
</style>
