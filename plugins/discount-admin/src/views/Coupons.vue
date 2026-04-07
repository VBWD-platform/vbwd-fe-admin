<template>
  <div class="coupons-view">
    <div class="page-header">
      <h1>Coupons</h1>
      <div class="page-header__actions">
        <button
          v-if="canManage"
          class="btn"
          @click="showBulkGenerate = true"
        >
          Bulk Generate
        </button>
        <router-link
          v-if="canManage"
          to="/admin/promotions/coupons/new"
          class="btn btn--primary"
        >
          + New Coupon
        </router-link>
      </div>
    </div>

    <!-- Bulk Generate Modal -->
    <div
      v-if="showBulkGenerate"
      class="modal-overlay"
      @click.self="showBulkGenerate = false"
    >
      <div class="modal">
        <h2>Bulk Generate Coupons</h2>
        <div class="form-group">
          <label>Discount</label>
          <select
            v-model="bulkDiscountId"
            class="form-input"
          >
            <option value="">
              — Select discount —
            </option>
            <option
              v-for="d in discounts"
              :key="d.id"
              :value="d.id"
            >
              {{ d.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Count</label>
          <input
            v-model.number="bulkCount"
            type="number"
            min="1"
            max="100"
            class="form-input"
          >
        </div>
        <div class="modal-actions">
          <button
            class="btn"
            @click="showBulkGenerate = false"
          >
            Cancel
          </button>
          <button
            class="btn btn--primary"
            :disabled="!bulkDiscountId || bulkCount < 1 || generating"
            @click="handleBulkGenerate"
          >
            {{ generating ? 'Generating...' : `Generate ${bulkCount} Coupons` }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="store.loading"
      class="loading"
    >
      Loading...
    </div>

    <table
      v-else-if="store.coupons.length > 0"
      class="data-table"
    >
      <thead>
        <tr>
          <th>Code</th>
          <th>Discount</th>
          <th>Uses</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="coupon in store.coupons"
          :key="coupon.id"
        >
          <td class="mono">
            <router-link
              :to="`/admin/promotions/coupons/${coupon.id}/edit`"
              class="link"
            >
              {{ coupon.code }}
            </router-link>
          </td>
          <td>{{ getDiscountName(coupon.discount_id) }}</td>
          <td>{{ coupon.current_uses }}{{ coupon.max_uses ? ` / ${coupon.max_uses}` : '' }}</td>
          <td>
            <span
              class="badge"
              :class="coupon.is_active ? 'badge--green' : 'badge--gray'"
            >
              {{ coupon.is_active ? 'Active' : 'Inactive' }}
            </span>
          </td>
          <td>
            <router-link
              :to="`/admin/promotions/coupons/${coupon.id}/usage`"
              class="btn btn--sm btn--ghost"
            >
              Usage
            </router-link>
            <button
              v-if="canManage"
              class="btn btn--sm btn--danger"
              @click="handleDelete(coupon.id, coupon.code)"
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
      No coupons yet.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useDiscountAdminStore } from '../stores/discountAdmin';

const authStore = useAuthStore();
const store = useDiscountAdminStore();

const canManage = computed(() => authStore.hasPermission('discount.coupons.manage'));
const discounts = ref<Array<{ id: string; name: string }>>([]);
const showBulkGenerate = ref(false);
const bulkDiscountId = ref('');
const bulkCount = ref(5);
const generating = ref(false);

function getDiscountName(discountId: string): string {
  return discounts.value.find(d => d.id === discountId)?.name || discountId;
}

async function handleDelete(id: string, code: string) {
  if (!confirm(`Delete coupon "${code}"?`)) return;
  await store.deleteCoupon(id);
}

async function handleBulkGenerate() {
  generating.value = true;
  try {
    await store.generateCoupons(bulkDiscountId.value, bulkCount.value);
    showBulkGenerate.value = false;
    await store.fetchCoupons();
  } finally {
    generating.value = false;
  }
}

onMounted(async () => {
  await Promise.all([store.fetchCoupons(), store.fetchDiscounts()]);
  discounts.value = store.discounts.map(d => ({ id: d.id, name: d.name }));
});
</script>

<style scoped>
.coupons-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header__actions { display: flex; gap: 8px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.mono { font-family: monospace; }
.link { color: #3b82f6; text-decoration: none; font-weight: 600; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
.badge--green { background: #d4edda; color: #155724; }
.badge--gray { background: #e9ecef; color: #6c757d; }
.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; background: white; }
.btn--primary { background: #3b82f6; color: white; border-color: #3b82f6; }
.btn--sm { padding: 4px 8px; font-size: 12px; }
.btn--danger { background: #ef4444; color: white; border-color: #ef4444; }
.btn--ghost { color: #3b82f6; border-color: transparent; }
.loading, .empty { padding: 40px; text-align: center; color: #6b7280; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 8px; padding: 24px; min-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
.modal h2 { margin: 0 0 16px; font-size: 1.1rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-input { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
</style>
