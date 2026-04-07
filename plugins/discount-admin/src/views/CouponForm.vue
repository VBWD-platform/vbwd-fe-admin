<template>
  <div class="coupon-form">
    <div class="page-header">
      <h1>{{ isNew ? 'New Coupon' : `Edit: ${form.code}` }}</h1>
      <div class="page-header__actions">
        <router-link
          to="/admin/promotions/coupons"
          class="btn"
        >
          Cancel
        </router-link>
        <button
          v-if="canManage"
          class="btn btn--primary"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>

    <div class="form-grid">
      <div class="form-group">
        <label>Code</label>
        <div class="code-input-row">
          <input
            v-model="form.code"
            type="text"
            class="form-input mono"
            placeholder="SUMMER2026"
            @input="form.code = form.code.toUpperCase()"
          >
          <button
            v-if="canManage"
            type="button"
            class="btn btn--sm"
            @click="generateCode"
          >
            Generate
          </button>
        </div>
      </div>
      <div class="form-group">
        <label>Discount</label>
        <select
          v-model="form.discount_id"
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
            {{ d.name }} ({{ d.discount_type }} {{ d.value }})
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Max Uses (empty = unlimited)</label>
        <input
          v-model="form.max_uses"
          type="number"
          class="form-input"
        >
      </div>
      <div class="form-group">
        <label>Max Uses Per User</label>
        <input
          v-model="form.max_uses_per_user"
          type="number"
          class="form-input"
        >
      </div>
      <div class="form-group">
        <label>Starts At</label>
        <input
          v-model="form.starts_at"
          type="datetime-local"
          class="form-input"
        >
      </div>
      <div class="form-group">
        <label>Expires At</label>
        <input
          v-model="form.expires_at"
          type="datetime-local"
          class="form-input"
        >
      </div>
      <div class="form-group">
        <label><input
          v-model="form.is_active"
          type="checkbox"
        > Active</label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDiscountAdminStore, type Discount } from '../stores/discountAdmin';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const store = useDiscountAdminStore();

const canManage = computed(() => authStore.hasPermission('discount.coupons.manage'));

const couponId = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !couponId.value || route.name === 'coupon-new');
const saving = ref(false);
const discounts = ref<Discount[]>([]);

const form = reactive({
  code: '',
  discount_id: '',
  max_uses: '',
  max_uses_per_user: '',
  starts_at: '',
  expires_at: '',
  is_active: true,
});

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  form.code = code;
}

async function save() {
  saving.value = true;
  try {
    const payload: Record<string, unknown> = { ...form };
    if (!payload.max_uses) payload.max_uses = null;
    if (!payload.max_uses_per_user) payload.max_uses_per_user = null;
    if (!payload.starts_at) payload.starts_at = null;
    if (!payload.expires_at) payload.expires_at = null;

    if (isNew.value) {
      const coupon = await store.createCoupon(payload);
      router.push(`/admin/promotions/coupons/${coupon.id}/edit`);
    } else {
      await store.updateCoupon(couponId.value!, payload);
    }
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await store.fetchDiscounts();
  discounts.value = store.discounts;

  if (!isNew.value && couponId.value) {
    const coupon = await store.fetchCoupon(couponId.value);
    if (coupon) {
      form.code = coupon.code;
      form.discount_id = coupon.discount_id;
      form.max_uses = coupon.max_uses ? String(coupon.max_uses) : '';
      form.max_uses_per_user = coupon.max_uses_per_user ? String(coupon.max_uses_per_user) : '';
      form.starts_at = coupon.starts_at || '';
      form.expires_at = coupon.expires_at || '';
      form.is_active = coupon.is_active;
    }
  }
});
</script>

<style scoped>
.coupon-form { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header__actions { display: flex; gap: 8px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-input { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
.form-input:focus { border-color: #3b82f6; outline: none; }
.mono { font-family: monospace; text-transform: uppercase; }
.code-input-row { display: flex; gap: 8px; }
.code-input-row .form-input { flex: 1; }
.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; background: white; }
.btn--primary { background: #3b82f6; color: white; border-color: #3b82f6; }
.btn--sm { padding: 4px 10px; font-size: 12px; }
</style>
