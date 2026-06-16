<template>
  <div
    class="referral-stats"
    data-testid="referral-stats-tab"
  >
    <div class="stats-header">
      <ImportExportControls
        v-if="showImportExport"
        :api="dataExchangeApi"
        entity-key="referral_coupons"
        :selected-ids="selectedCouponIds"
        :can-export="capabilities.can_export"
        :can-import="capabilities.can_import"
        :can-export-pii="capabilities.can_export_pii"
        :is-superadmin="isSuperAdmin"
        :supported-formats="capabilities.supported_formats"
        @refresh="reload"
      />
    </div>

    <div class="toolbar">
      <input
        v-model="search"
        type="text"
        class="search-input"
        data-testid="referral-stats-search"
        :placeholder="$t('referralAdmin.searchPlaceholder')"
        @input="reload"
      >
      <select
        v-model="statusFilter"
        class="filter-select"
        data-testid="referral-stats-status-filter"
        @change="reload"
      >
        <option value="">
          {{ $t('referralAdmin.allStatuses') }}
        </option>
        <option value="issued">
          {{ $t('referralAdmin.statusIssued') }}
        </option>
        <option value="used">
          {{ $t('referralAdmin.statusUsed') }}
        </option>
        <option value="expired">
          {{ $t('referralAdmin.statusExpired') }}
        </option>
      </select>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      {{ $t('common.loading') }}
    </div>

    <div
      v-if="!loading && selectedIds.size > 0"
      class="bulk-actions"
      data-testid="referral-stats-bulk-toolbar"
    >
      <span data-testid="referral-stats-selected-count">
        {{ selectedIds.size }} {{ $t('referralAdmin.selected') }}
      </span>
      <button
        class="btn btn--sm btn--danger"
        data-testid="referral-stats-bulk-delete-btn"
        @click="handleBulkDelete"
      >
        {{ $t('referralAdmin.deleteSelected') }}
      </button>
    </div>

    <table
      v-if="!loading && coupons.length > 0"
      class="data-table"
      data-testid="referral-stats-table"
    >
      <thead>
        <tr>
          <th class="col-check">
            <input
              type="checkbox"
              data-testid="referral-stats-select-all"
              :checked="allSelected"
              :indeterminate="someSelected && !allSelected"
              @change="toggleAll"
            >
          </th>
          <th
            class="sortable"
            @click="sortBy('issuer_nickname')"
          >
            {{ $t('referralAdmin.colIssuer') }}
          </th>
          <th
            class="sortable"
            @click="sortBy('coupon_code')"
          >
            {{ $t('referralAdmin.colCouponCode') }}
          </th>
          <th>{{ $t('referralAdmin.colDiscountPercent') }}</th>
          <th>{{ $t('referralAdmin.colDiscountAmount') }}</th>
          <th>{{ $t('referralAdmin.colCommissionTokens') }}</th>
          <th
            class="sortable"
            @click="sortBy('status')"
          >
            {{ $t('referralAdmin.colStatus') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="coupon in coupons"
          :key="coupon.id"
          :data-testid="`referral-stats-row-${coupon.id}`"
        >
          <td class="col-check">
            <input
              type="checkbox"
              :data-testid="`referral-stats-select-${coupon.id}`"
              :checked="selectedIds.has(coupon.id)"
              @change="toggleSelected(coupon.id)"
            >
          </td>
          <td>{{ coupon.issuer_nickname }}</td>
          <td
            class="mono"
            :data-testid="`referral-stats-code-${coupon.id}`"
          >
            {{ coupon.coupon_code }}
          </td>
          <td>{{ coupon.discount_value ?? '-' }}</td>
          <td>{{ coupon.discount_amount ?? '' }}</td>
          <td>{{ coupon.commission_tokens_paid ?? '' }}</td>
          <td>{{ coupon.status }}</td>
        </tr>
      </tbody>
    </table>

    <p
      v-else-if="!loading"
      class="empty"
    >
      {{ $t('referralAdmin.empty') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ImportExportControls } from 'vbwd-view-component';
import { useAuthStore } from '@/stores/auth';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';
import { useReferralAdminStore } from '../stores/referralAdmin';

const store = useReferralAdminStore();
const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

const search = ref('');
const statusFilter = ref('');
const sortKey = ref('issued_at');
const sortAsc = ref(false);
const selectedIds = reactive(new Set<string>());

const dataExchangeApi = createDataExchangeApi();
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const capabilities = computed(() => capabilitiesFor('referral_coupons'));
const showImportExport = computed(
  () => capabilities.value.can_export || capabilities.value.can_import,
);

const coupons = computed(() => store.coupons);
const loading = computed(() => store.loading);
const selectedCouponIds = computed(() => [...selectedIds]);

const allSelected = computed(
  () =>
    coupons.value.length > 0 &&
    coupons.value.every((coupon) => selectedIds.has(coupon.id)),
);
const someSelected = computed(() =>
  coupons.value.some((coupon) => selectedIds.has(coupon.id)),
);

async function reload() {
  await store.fetchCoupons({
    search: search.value.trim() || undefined,
    status: statusFilter.value || undefined,
    sort: sortKey.value,
    order: sortAsc.value ? 'asc' : 'desc',
  });
}

function sortBy(key: string) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = true;
  }
  reload();
}

function toggleSelected(id: string) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
}

function toggleAll() {
  if (allSelected.value) {
    coupons.value.forEach((coupon) => selectedIds.delete(coupon.id));
  } else {
    coupons.value.forEach((coupon) => selectedIds.add(coupon.id));
  }
}

async function handleBulkDelete() {
  const count = selectedIds.size;
  if (!confirm(`Delete ${count} selected referral coupon(s)?`)) return;
  await store.bulkDeleteCoupons([...selectedIds]);
  selectedIds.clear();
  await reload();
}

onMounted(() => {
  reload();
  loadManifest();
});
</script>

<style scoped>
.referral-stats { padding: 8px 0; }
.stats-header { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.search-input { flex: 1; max-width: 320px; padding: 10px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.filter-select { padding: 10px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.sortable { cursor: pointer; user-select: none; }
.mono { font-family: monospace; font-size: 0.85rem; color: #6b7280; }
.col-check { width: 40px; text-align: center; }
.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; background: white; }
.btn--sm { padding: 4px 8px; font-size: 12px; }
.btn--danger { background: #ef4444; color: white; border-color: #ef4444; }
.bulk-actions { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: #fef3c7; border-radius: 4px; margin-bottom: 12px; font-size: 14px; color: #92400e; }
.loading, .empty { padding: 40px; text-align: center; color: #6b7280; }
</style>
