<template>
  <div class="coupon-usage">
    <div class="page-header">
      <h1>Coupon Usage: {{ couponCode }}</h1>
      <router-link to="/admin/promotions/coupons" class="btn">Back to Coupons</router-link>
    </div>

    <div v-if="store.loading" class="loading">Loading...</div>

    <table v-else-if="store.usages.length > 0" class="data-table">
      <thead>
        <tr>
          <th>User</th>
          <th>Invoice</th>
          <th>Discount Amount</th>
          <th>Used At</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="usage in store.usages" :key="usage.id">
          <td>{{ usage.user_id }}</td>
          <td>
            <router-link v-if="usage.invoice_id" :to="`/admin/invoices/${usage.invoice_id}`" class="link">
              {{ usage.invoice_id.substring(0, 8) }}...
            </router-link>
            <span v-else>—</span>
          </td>
          <td>{{ usage.discount_amount }}</td>
          <td>{{ new Date(usage.used_at).toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else class="empty">No usage records yet.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useDiscountAdminStore } from '../stores/discountAdmin';

const route = useRoute();
const store = useDiscountAdminStore();
const couponId = computed(() => route.params.id as string);
const couponCode = ref('');

onMounted(async () => {
  const coupon = await store.fetchCoupon(couponId.value);
  if (coupon) couponCode.value = coupon.code;
  await store.fetchCouponUsage(couponId.value);
});
</script>

<style scoped>
.coupon-usage { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.link { color: #3b82f6; text-decoration: none; }
.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; background: white; }
.loading, .empty { padding: 40px; text-align: center; color: #6b7280; }
</style>
