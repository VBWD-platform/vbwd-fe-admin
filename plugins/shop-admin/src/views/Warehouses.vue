<template>
  <div
    class="warehouses-view"
    data-testid="warehouses-list"
  >
    <div class="page-header">
      <h1>Warehouses</h1>
    </div>

    <div
      v-if="loading"
      class="loading"
      data-testid="warehouses-loading"
    >
      Loading...
    </div>

    <div
      v-else-if="error"
      class="error"
      data-testid="warehouses-error"
    >
      {{ error }}
    </div>

    <template v-else-if="!selectedWarehouse">
      <table
        v-if="warehouses.length > 0"
        class="data-table"
        data-testid="warehouses-table"
      >
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Address</th>
            <th>Stock Items</th>
            <th>Default</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="warehouse in warehouses"
            :key="warehouse.id"
            :data-testid="`warehouse-row-${warehouse.id}`"
            class="clickable-row"
            @click="selectWarehouse(warehouse)"
          >
            <td>{{ warehouse.name }}</td>
            <td><code>{{ warehouse.slug }}</code></td>
            <td>{{ warehouse.address || '—' }}</td>
            <td>{{ warehouse.stock_item_count ?? 0 }}</td>
            <td>
              <span
                v-if="warehouse.is_default"
                class="status-badge default"
                data-testid="default-badge"
              >
                Default
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <p
        v-else
        class="empty-state"
        data-testid="warehouses-empty"
      >
        No warehouses configured.
      </p>
    </template>

    <div
      v-else
      class="warehouse-detail"
      data-testid="warehouse-detail"
    >
      <div class="detail-header">
        <button
          class="btn btn--secondary"
          data-testid="back-to-warehouses"
          @click="selectedWarehouse = null"
        >
          &larr; Back
        </button>
        <h2>{{ selectedWarehouse.name }}</h2>
        <span
          v-if="selectedWarehouse.is_default"
          class="status-badge default"
        >Default</span>
      </div>

      <p
        v-if="selectedWarehouse.address"
        class="detail-address"
      >
        {{ selectedWarehouse.address }}
      </p>

      <div
        v-if="detailLoading"
        class="loading"
        data-testid="detail-loading"
      >
        Loading stock...
      </div>

      <table
        v-else-if="warehouseStock.length > 0"
        class="data-table"
        data-testid="warehouse-stock-table"
      >
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Reserved</th>
            <th>Available</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in warehouseStock"
            :key="item.product_id"
            :data-testid="`warehouse-stock-row-${item.product_id}`"
          >
            <td>{{ item.product_name }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.reserved }}</td>
            <td>{{ item.available }}</td>
          </tr>
        </tbody>
      </table>

      <p
        v-else
        class="empty-state"
        data-testid="warehouse-stock-empty"
      >
        No stock in this warehouse.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api';

interface Warehouse {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  stock_item_count: number;
  is_default: boolean;
}

interface WarehouseStockItem {
  product_id: string;
  product_name: string;
  quantity: number;
  reserved: number;
  available: number;
}

const warehouses = ref<Warehouse[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedWarehouse = ref<Warehouse | null>(null);
const warehouseStock = ref<WarehouseStockItem[]>([]);
const detailLoading = ref(false);

async function fetchWarehouses() {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get('/admin/shop/warehouses') as { warehouses: Warehouse[] };
    warehouses.value = response.warehouses;
  } catch (fetchError) {
    error.value = (fetchError as Error).message;
  } finally {
    loading.value = false;
  }
}

async function selectWarehouse(warehouse: Warehouse) {
  selectedWarehouse.value = warehouse;
  detailLoading.value = true;
  try {
    const response = await api.get(`/admin/shop/warehouses/${warehouse.id}/stock`) as { stock: WarehouseStockItem[] };
    warehouseStock.value = response.stock;
  } catch (fetchError) {
    error.value = (fetchError as Error).message;
    selectedWarehouse.value = null;
  } finally {
    detailLoading.value = false;
  }
}

onMounted(() => {
  fetchWarehouses();
});
</script>

<style scoped>
.warehouses-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { margin-bottom: 20px; }
.detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.detail-header h2 { margin: 0; }
.detail-address { color: #6b7280; margin-bottom: 16px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.data-table code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
.clickable-row { cursor: pointer; }
.clickable-row:hover td { background: #f8f9fa; }
.status-badge { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.status-badge.default { background: #dbeafe; color: #1e40af; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; }
.btn--secondary { background: #6b7280; color: white; }
.empty-state { text-align: center; padding: 40px; color: #666; }
.loading, .error { padding: 20px; text-align: center; }
.error { color: #dc2626; }
</style>
