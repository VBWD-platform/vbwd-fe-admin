<template>
  <div
    class="orders-view"
    data-testid="orders-list"
  >
    <div class="page-header">
      <h1>Orders</h1>
      <div class="header-actions">
        <ImportExportControls
          v-if="showImportExport"
          :api="dataExchangeApi"
          entity-key="shop_orders"
          :selected-ids="selectedOrderIds"
          :can-export="ordersCaps.can_export"
          :can-import="ordersCaps.can_import"
          :can-export-pii="ordersCaps.can_export_pii"
          :supported-formats="ordersCaps.supported_formats"
        />
        <select
          v-model="statusFilter"
          class="status-filter"
          data-testid="order-status-filter"
          @change="handleFilterChange"
        >
          <option value="">
            All Statuses
          </option>
          <option value="pending">
            Pending
          </option>
          <option value="confirmed">
            Confirmed
          </option>
          <option value="shipped">
            Shipped
          </option>
          <option value="completed">
            Completed
          </option>
          <option value="cancelled">
            Cancelled
          </option>
        </select>
      </div>
    </div>

    <div
      v-if="store.loading"
      class="loading"
      data-testid="orders-loading"
    >
      Loading...
    </div>

    <div
      v-else-if="store.error"
      class="error"
      data-testid="orders-error"
    >
      {{ store.error }}
    </div>

    <table
      v-else-if="store.orders.length > 0"
      class="data-table"
      data-testid="orders-table"
    >
      <thead>
        <tr>
          <th class="checkbox-col">
            <input
              type="checkbox"
              :checked="allSelected"
              data-testid="select-all-orders"
              @change="toggleAll"
            >
          </th>
          <th>Order Number</th>
          <th>Status</th>
          <th>Total</th>
          <th>Currency</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="order in store.orders"
          :key="order.id"
          :data-testid="`order-row-${order.id}`"
          class="clickable-row"
          @click="$router.push(`/admin/shop/orders/${order.id}`)"
        >
          <td
            class="checkbox-col"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="selectedIds.has(order.id)"
              :data-testid="`select-order-${order.id}`"
              @change="toggleSelect(order.id)"
            >
          </td>
          <td>{{ order.order_number }}</td>
          <td>
            <span
              class="status-badge"
              :class="`status--${order.status}`"
              :data-testid="`order-status-${order.id}`"
            >
              {{ order.status }}
            </span>
          </td>
          <td>{{ order.total_amount }}</td>
          <td>{{ order.currency }}</td>
          <td>{{ formatDate(order.created_at) }}</td>
        </tr>
      </tbody>
    </table>

    <p
      v-else
      class="empty-state"
      data-testid="orders-empty"
    >
      No orders found.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ImportExportControls } from 'vbwd-view-component';
import { useOrderAdminStore } from '../stores/orderAdmin';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';

const store = useOrderAdminStore();
const statusFilter = ref('');

// Row selection (for "export selected"). Orders are export-only — the backend
// `shop_orders` exchanger reports can_import=false, so the import button is
// hidden by the control via the manifest.
const selectedIds = reactive(new Set<string>());
const allSelected = computed(
  () => store.orders.length > 0 && store.orders.every(o => selectedIds.has(o.id)),
);
const selectedOrderIds = computed(() => Array.from(selectedIds));

function toggleSelect(orderId: string) {
  if (selectedIds.has(orderId)) {
    selectedIds.delete(orderId);
  } else {
    selectedIds.add(orderId);
  }
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.clear();
  } else {
    store.orders.forEach(o => selectedIds.add(o.id));
  }
}

// Import/Export controls (export-only for orders).
const dataExchangeApi = createDataExchangeApi();
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const ordersCaps = computed(() => capabilitiesFor('shop_orders'));
const showImportExport = computed(
  () => ordersCaps.value.can_export || ordersCaps.value.can_import,
);

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString();
}

function handleFilterChange() {
  store.fetchOrders(1, store.perPage, statusFilter.value);
}

onMounted(() => {
  store.fetchOrders();
  loadManifest();
});
</script>

<style scoped>
.orders-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.checkbox-col { width: 40px; text-align: center !important; }
.status-filter { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.clickable-row { cursor: pointer; }
.clickable-row:hover td { background: #f8f9fa; }
.status-badge { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
.status--pending { background: #fef3c7; color: #92400e; }
.status--confirmed { background: #dbeafe; color: #1e40af; }
.status--shipped { background: #e0e7ff; color: #3730a3; }
.status--completed { background: #d4edda; color: #155724; }
.status--cancelled { background: #f8d7da; color: #721c24; }
.empty-state { text-align: center; padding: 40px; color: #666; }
.loading, .error { padding: 20px; text-align: center; }
.error { color: #dc2626; }
</style>
