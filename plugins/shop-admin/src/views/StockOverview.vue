<template>
  <div
    class="stock-overview-view"
    data-testid="stock-overview"
  >
    <div class="page-header">
      <h1>Stock Overview</h1>
    </div>

    <div
      v-if="loading"
      class="loading"
      data-testid="stock-loading"
    >
      Loading...
    </div>

    <div
      v-else-if="error"
      class="error"
      data-testid="stock-error"
    >
      {{ error }}
    </div>

    <table
      v-else-if="stockItems.length > 0"
      class="data-table"
      data-testid="stock-table"
    >
      <thead>
        <tr>
          <th>Product</th>
          <th>Total Stock</th>
          <th>Reserved</th>
          <th>Available</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in stockItems"
          :key="item.product_id"
          :data-testid="`stock-row-${item.product_id}`"
        >
          <td>{{ item.product_name }}</td>
          <td>{{ item.quantity }}</td>
          <td>{{ item.reserved }}</td>
          <td>{{ item.available }}</td>
          <td>
            <span
              v-if="item.is_low_stock"
              class="status-badge low-stock"
              data-testid="low-stock-badge"
            >
              Low Stock
            </span>
            <span
              v-else
              class="status-badge in-stock"
            >
              In Stock
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-else
      class="empty-state"
      data-testid="stock-empty"
    >
      No stock data available.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api';

interface StockItem {
  product_id: string;
  product_name: string;
  quantity: number;
  reserved: number;
  available: number;
  is_low_stock: boolean;
}

const stockItems = ref<StockItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function fetchStock() {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get('/admin/shop/stock') as { stock: StockItem[] };
    stockItems.value = response.stock;
  } catch (fetchError) {
    error.value = (fetchError as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchStock();
});
</script>

<style scoped>
.stock-overview-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { margin-bottom: 20px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.status-badge { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.status-badge.in-stock { background: #d4edda; color: #155724; }
.status-badge.low-stock { background: #fff3cd; color: #856404; }
.empty-state { text-align: center; padding: 40px; color: #666; }
.loading, .error { padding: 20px; text-align: center; }
.error { color: #dc2626; }
</style>
