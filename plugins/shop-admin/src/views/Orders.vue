<template>
  <div
    class="orders-view"
    data-testid="orders-list"
  >
    <div class="page-header">
      <h1>Orders</h1>
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
import { ref, onMounted } from 'vue';
import { useOrderAdminStore } from '../stores/orderAdmin';

const store = useOrderAdminStore();
const statusFilter = ref('');

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString();
}

function handleFilterChange() {
  store.fetchOrders(1, store.perPage, statusFilter.value);
}

onMounted(() => {
  store.fetchOrders();
});
</script>

<style scoped>
.orders-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
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
