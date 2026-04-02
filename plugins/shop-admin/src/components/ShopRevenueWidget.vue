<template>
  <div
    class="shop-revenue-widget"
    data-testid="shop-revenue-widget"
  >
    <h2>Shop Revenue</h2>

    <div
      v-if="loading"
      class="loading"
      data-testid="shop-revenue-loading"
    >
      Loading...
    </div>

    <div
      v-else
      class="stats"
    >
      <div
        class="stat-card"
        data-testid="revenue-total"
      >
        <span class="stat-label">Total Revenue</span>
        <span class="stat-value">{{ totalRevenue }}</span>
      </div>
      <div
        class="stat-card"
        data-testid="revenue-orders-count"
      >
        <span class="stat-label">Orders</span>
        <span class="stat-value">{{ ordersCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api';

const loading = ref(false);
const totalRevenue = ref('0.00');
const ordersCount = ref(0);

async function fetchRevenue() {
  loading.value = true;
  try {
    const response = await api.get('/admin/shop/analytics/revenue') as {
      total_revenue: string;
      orders_count: number;
    };
    totalRevenue.value = response.total_revenue;
    ordersCount.value = response.orders_count;
  } catch {
    // silently fail for dashboard widget
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchRevenue();
});
</script>

<style scoped>
.shop-revenue-widget { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
.shop-revenue-widget h2 { font-size: 16px; margin-bottom: 16px; }
.stats { display: flex; gap: 16px; }
.stat-card { flex: 1; background: #f8f9fa; padding: 16px; border-radius: 6px; text-align: center; }
.stat-label { display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px; }
.stat-value { display: block; font-size: 24px; font-weight: 700; color: #111827; }
.loading { padding: 20px; text-align: center; color: #666; }
</style>
