<template>
  <div
    class="order-details-view"
    data-testid="order-details"
  >
    <div class="page-header">
      <h1>Order Details</h1>
      <router-link
        to="/admin/shop/orders"
        class="btn btn--secondary"
        data-testid="back-to-orders-btn"
      >
        Back to Orders
      </router-link>
    </div>

    <div
      v-if="store.loading"
      class="loading"
      data-testid="order-details-loading"
    >
      Loading...
    </div>

    <div
      v-else-if="store.error"
      class="error"
      data-testid="order-details-error"
    >
      {{ store.error }}
    </div>

    <template v-else-if="order">
      <div
        class="order-summary"
        data-testid="order-summary"
      >
        <div class="summary-row">
          <span class="label">Order Number</span>
          <span data-testid="order-number">{{ order.order_number }}</span>
        </div>
        <div class="summary-row">
          <span class="label">Status</span>
          <span
            class="status-badge"
            :class="`status--${order.status}`"
            data-testid="order-status-badge"
          >
            {{ order.status }}
          </span>
        </div>
        <div class="summary-row">
          <span class="label">Subtotal</span>
          <span>{{ order.subtotal }} {{ order.currency }}</span>
        </div>
        <div class="summary-row">
          <span class="label">Tax</span>
          <span>{{ order.tax_amount }} {{ order.currency }}</span>
        </div>
        <div class="summary-row">
          <span class="label">Shipping Cost</span>
          <span>{{ order.shipping_cost }} {{ order.currency }}</span>
        </div>
        <div class="summary-row total">
          <span class="label">Total</span>
          <span data-testid="order-total">{{ order.total_amount }} {{ order.currency }}</span>
        </div>
      </div>

      <div
        class="section"
        data-testid="order-shipping-info"
      >
        <h2>Shipping</h2>
        <p v-if="order.shipping_method">
          Method: {{ order.shipping_method }}
        </p>
        <p
          v-if="order.tracking_number"
          data-testid="tracking-number"
        >
          Tracking: {{ order.tracking_number }}
        </p>
        <p v-if="order.tracking_url">
          <a
            :href="order.tracking_url"
            target="_blank"
            data-testid="tracking-url"
          >Track Shipment</a>
        </p>
        <div
          v-if="Object.keys(order.shipping_address).length > 0"
          class="address-block"
        >
          <p
            v-for="(value, key) in order.shipping_address"
            :key="key"
          >
            {{ value }}
          </p>
        </div>
      </div>

      <div class="section">
        <h2>Items</h2>
        <table
          class="data-table"
          data-testid="order-items-table"
        >
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th>Refunded</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in order.items"
              :key="item.id"
              :data-testid="`order-item-${item.id}`"
            >
              <td>{{ (item.product_snapshot as Record<string, unknown>)?.name || item.product_id }}</td>
              <td>{{ item.quantity }}</td>
              <td>{{ item.unit_price }} {{ order.currency }}</td>
              <td>{{ item.total_price }} {{ order.currency }}</td>
              <td>{{ item.is_refunded ? 'Yes' : 'No' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="order-actions"
        data-testid="order-actions"
      >
        <button
          v-if="order.status === 'confirmed' && canManage"
          class="btn btn--primary"
          :disabled="store.loading"
          data-testid="ship-order-btn"
          @click="handleShipOrder"
        >
          Ship Order
        </button>
        <button
          v-if="order.status === 'shipped' && canManage"
          class="btn btn--primary"
          :disabled="store.loading"
          data-testid="complete-order-btn"
          @click="handleCompleteOrder"
        >
          Complete Order
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useOrderAdminStore } from '../stores/orderAdmin';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const store = useOrderAdminStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('shop.orders.manage'));

const orderId = computed(() => route.params.id as string);
const order = computed(() => store.selectedOrder);

async function handleShipOrder() {
  const trackingNumber = prompt('Enter tracking number:');
  const trackingUrl = prompt('Enter tracking URL (optional):') || '';
  if (trackingNumber) {
    await store.shipOrder(orderId.value, trackingNumber, trackingUrl);
  }
}

async function handleCompleteOrder() {
  if (confirm('Mark this order as completed?')) {
    await store.completeOrder(orderId.value);
  }
}

onMounted(() => {
  store.fetchOrder(orderId.value);
});
</script>

<style scoped>
.order-details-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.order-summary { background: #f8f9fa; padding: 16px; border-radius: 6px; margin-bottom: 24px; }
.summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
.summary-row.total { border-top: 2px solid #dee2e6; padding-top: 10px; margin-top: 6px; font-weight: 700; }
.summary-row .label { color: #6b7280; }
.section { margin-bottom: 24px; }
.section h2 { font-size: 16px; margin-bottom: 12px; }
.address-block { background: #f8f9fa; padding: 12px; border-radius: 4px; margin-top: 8px; }
.address-block p { margin: 2px 0; font-size: 14px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.order-actions { display: flex; gap: 12px; margin-top: 24px; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; }
.btn--primary { background: #3b82f6; color: white; }
.btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--secondary { background: #e5e7eb; color: #374151; }
.status-badge { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
.status--pending { background: #fef3c7; color: #92400e; }
.status--confirmed { background: #dbeafe; color: #1e40af; }
.status--shipped { background: #e0e7ff; color: #3730a3; }
.status--completed { background: #d4edda; color: #155724; }
.status--cancelled { background: #f8d7da; color: #721c24; }
.loading, .error { padding: 20px; text-align: center; }
.error { color: #dc2626; }
</style>
