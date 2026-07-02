<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useMarketplaceAdminStore, type Vendor } from '../stores/marketplaceAdmin';

const store = useMarketplaceAdminStore();
const statusFilter = ref('');
const busyVendorId = ref<string | null>(null);

const vendors = computed<Vendor[]>(() => store.vendors);

function formatDate(dateString: string): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? dateString : date.toLocaleDateString();
}

async function reload() {
  await store.fetchVendors(statusFilter.value || undefined);
}

async function approve(vendor: Vendor) {
  busyVendorId.value = vendor.id;
  try {
    await store.updateVendor(vendor.id, 'approve');
  } finally {
    busyVendorId.value = null;
  }
}

async function suspend(vendor: Vendor) {
  busyVendorId.value = vendor.id;
  try {
    await store.updateVendor(vendor.id, 'suspend');
  } finally {
    busyVendorId.value = null;
  }
}

onMounted(() => {
  reload();
});
</script>

<template>
  <div class="vendors-view">
    <div class="vendors-header">
      <div class="header-left">
        <h2>{{ $t('marketplace.vendors.title') }}</h2>
        <span class="subtitle">{{ $t('marketplace.vendors.subtitle') }}</span>
      </div>
    </div>

    <div class="vendors-filters">
      <select
        v-model="statusFilter"
        class="filter-select"
        data-testid="vendors-status-filter"
        @change="reload"
      >
        <option value="">
          {{ $t('marketplace.vendors.filter.all') }}
        </option>
        <option value="pending">
          {{ $t('marketplace.vendors.statuses.pending') }}
        </option>
        <option value="active">
          {{ $t('marketplace.vendors.statuses.active') }}
        </option>
        <option value="suspended">
          {{ $t('marketplace.vendors.statuses.suspended') }}
        </option>
      </select>
    </div>

    <div
      v-if="store.loading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('marketplace.vendors.loading') }}</p>
    </div>

    <div
      v-else-if="vendors.length === 0"
      class="empty-state"
      data-testid="vendors-empty"
    >
      <p>{{ $t('marketplace.vendors.empty') }}</p>
    </div>

    <div
      v-else
      class="vendors-table-wrap"
    >
      <table
        class="vendors-table"
        data-testid="vendors-table"
      >
        <thead>
          <tr>
            <th>{{ $t('marketplace.vendors.table.name') }}</th>
            <th>{{ $t('marketplace.vendors.table.status') }}</th>
            <th>{{ $t('marketplace.vendors.table.created') }}</th>
            <th>{{ $t('marketplace.vendors.table.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="vendor in vendors"
            :key="vendor.id"
            class="vendor-row"
            data-testid="vendor-row"
            :data-vendor-id="vendor.id"
          >
            <td data-testid="vendor-name">
              {{ vendor.display_name || $t('marketplace.vendors.unknown') }}
            </td>
            <td>
              <span
                class="status-badge"
                :class="vendor.status"
                data-testid="vendor-status"
              >
                {{ vendor.status }}
              </span>
            </td>
            <td>{{ formatDate(vendor.created_at) }}</td>
            <td class="actions-col">
              <button
                v-if="vendor.status !== 'active'"
                class="action-btn approve-btn"
                data-testid="vendor-approve"
                :disabled="busyVendorId === vendor.id"
                @click="approve(vendor)"
              >
                {{ $t('marketplace.vendors.actions.approve') }}
              </button>
              <button
                v-if="vendor.status === 'active'"
                class="action-btn suspend-btn"
                data-testid="vendor-suspend"
                :disabled="busyVendorId === vendor.id"
                @click="suspend(vendor)"
              >
                {{ $t('marketplace.vendors.actions.suspend') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.vendors-view { background: white; padding: 20px; border-radius: 8px; }
.vendors-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.vendors-header h2 { margin: 0; color: #2c3e50; }
.header-left { display: flex; flex-direction: column; gap: 4px; }
.subtitle { color: #666; font-size: 0.9rem; }

.vendors-filters { display: flex; gap: 15px; margin-bottom: 20px; }
.filter-select { padding: 10px 15px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; min-width: 180px; }

.loading-state, .empty-state { text-align: center; padding: 40px; color: #666; }
.spinner { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.vendors-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.vendors-table { width: 100%; border-collapse: collapse; }
.vendors-table th, .vendors-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
.vendors-table th { background: #f8f9fa; font-weight: 600; color: #2c3e50; }

.status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 500; text-transform: capitalize; }
.status-badge.active { background: #d4edda; color: #155724; }
.status-badge.pending { background: #fff3cd; color: #856404; }
.status-badge.suspended { background: #f8d7da; color: #721c24; }

.actions-col { white-space: nowrap; }
.action-btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.approve-btn { background: #d4edda; color: #155724; }
.approve-btn:hover:not(:disabled) { background: #c3e6cb; }
.suspend-btn { background: #f8d7da; color: #721c24; }
.suspend-btn:hover:not(:disabled) { background: #f5c6cb; }

@media (max-width: 768px) {
  .vendors-view { padding: 12px; border-radius: 0; }
  .vendors-table { min-width: 560px; }
}
</style>
