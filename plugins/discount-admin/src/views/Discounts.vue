<template>
  <div class="discounts-view">
    <div class="page-header">
      <h1>Discounts</h1>
      <router-link
        v-if="canManage"
        to="/admin/promotions/discounts/new"
        class="btn btn--primary"
      >
        + New Discount
      </router-link>
    </div>

    <div
      v-if="store.loading"
      class="loading"
    >
      Loading...
    </div>

    <table
      v-else-if="store.discounts.length > 0"
      class="data-table"
    >
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Scope</th>
          <th>Value</th>
          <th>Uses</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="discount in store.discounts"
          :key="discount.id"
        >
          <td>
            <router-link
              :to="`/admin/promotions/discounts/${discount.id}/edit`"
              class="link"
            >
              {{ discount.name }}
            </router-link>
          </td>
          <td><span class="badge badge--blue">{{ discount.discount_type }}</span></td>
          <td><span class="badge badge--purple">{{ discount.scope }}</span></td>
          <td>{{ discount.discount_type === 'PERCENTAGE' ? `${discount.value}%` : `${discount.value} ${discount.currency || 'EUR'}` }}</td>
          <td>{{ discount.current_uses }}{{ discount.max_uses ? ` / ${discount.max_uses}` : '' }}</td>
          <td>
            <span
              class="badge"
              :class="discount.is_active ? 'badge--green' : 'badge--gray'"
            >
              {{ discount.is_active ? 'Active' : 'Inactive' }}
            </span>
          </td>
          <td>
            <button
              v-if="canManage"
              class="btn btn--sm btn--danger"
              @click="handleDelete(discount.id, discount.name)"
            >
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-else
      class="empty"
    >
      No discounts yet.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useDiscountAdminStore } from '../stores/discountAdmin';

const authStore = useAuthStore();
const store = useDiscountAdminStore();

const canManage = computed(() => authStore.hasPermission('discount.discounts.manage'));

async function handleDelete(id: string, name: string) {
  if (!confirm(`Delete discount "${name}"?`)) return;
  await store.deleteDiscount(id);
}

onMounted(() => store.fetchDiscounts());
</script>

<style scoped>
.discounts-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.link { color: #3b82f6; text-decoration: none; font-weight: 600; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
.badge--green { background: #d4edda; color: #155724; }
.badge--gray { background: #e9ecef; color: #6c757d; }
.badge--blue { background: #cce5ff; color: #004085; }
.badge--purple { background: #ede7f6; color: #4527a0; }
.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; background: white; }
.btn--primary { background: #3b82f6; color: white; border-color: #3b82f6; }
.btn--sm { padding: 4px 8px; font-size: 12px; }
.btn--danger { background: #ef4444; color: white; border-color: #ef4444; }
.loading, .empty { padding: 40px; text-align: center; color: #6b7280; }
</style>
