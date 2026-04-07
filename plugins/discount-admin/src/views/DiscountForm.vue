<template>
  <div class="discount-form">
    <div class="page-header">
      <h1>{{ isNew ? 'New Discount' : `Edit: ${form.name}` }}</h1>
      <div class="page-header__actions">
        <router-link
          to="/admin/promotions/discounts"
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
        <label>Name</label>
        <input
          v-model="form.name"
          type="text"
          class="form-input"
        >
      </div>
      <div class="form-group">
        <label>Slug</label>
        <input
          v-model="form.slug"
          type="text"
          class="form-input mono"
        >
      </div>
      <div class="form-group">
        <label>Type</label>
        <select
          v-model="form.discount_type"
          class="form-input"
        >
          <option value="PERCENTAGE">
            Percentage
          </option>
          <option value="FIXED_AMOUNT">
            Fixed Amount
          </option>
          <option value="FREE_SHIPPING">
            Free Shipping
          </option>
          <option value="BUY_X_GET_Y">
            Buy X Get Y
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Value</label>
        <input
          v-model="form.value"
          type="number"
          step="0.01"
          class="form-input"
        >
      </div>
      <div class="form-group">
        <label>Scope</label>
        <select
          v-model="form.scope"
          class="form-input"
        >
          <option value="GLOBAL">
            Global
          </option>
          <option value="ECOMMERCE">
            Shop
          </option>
          <option value="SUBSCRIPTION">
            Subscription
          </option>
          <option value="BOOKING">
            Booking
          </option>
        </select>
      </div>
      <div
        v-if="form.discount_type === 'FIXED_AMOUNT'"
        class="form-group"
      >
        <label>Currency</label>
        <input
          v-model="form.currency"
          type="text"
          class="form-input"
          placeholder="EUR"
        >
      </div>
      <div class="form-group">
        <label>Min Order Amount</label>
        <input
          v-model="form.min_order_amount"
          type="number"
          step="0.01"
          class="form-input"
        >
      </div>
      <div class="form-group">
        <label>Max Discount Amount</label>
        <input
          v-model="form.max_discount_amount"
          type="number"
          step="0.01"
          class="form-input"
        >
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
        <label>Priority (lower = higher)</label>
        <input
          v-model="form.priority"
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
      <div class="form-group">
        <label><input
          v-model="form.stackable"
          type="checkbox"
        > Stackable</label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDiscountAdminStore } from '../stores/discountAdmin';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const store = useDiscountAdminStore();

const canManage = computed(() => authStore.hasPermission('discount.discounts.manage'));

const discountId = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !discountId.value || route.name === 'discount-new');
const saving = ref(false);

const form = reactive({
  name: '',
  slug: '',
  discount_type: 'PERCENTAGE',
  value: '0',
  currency: 'EUR',
  scope: 'GLOBAL',
  min_order_amount: '',
  max_discount_amount: '',
  max_uses: '',
  max_uses_per_user: '',
  priority: 100,
  starts_at: '',
  expires_at: '',
  is_active: true,
  stackable: false,
});

async function save() {
  saving.value = true;
  try {
    const payload: Record<string, unknown> = { ...form };
    if (!payload.min_order_amount) payload.min_order_amount = null;
    if (!payload.max_discount_amount) payload.max_discount_amount = null;
    if (!payload.max_uses) payload.max_uses = null;
    if (!payload.max_uses_per_user) payload.max_uses_per_user = null;
    if (!payload.starts_at) payload.starts_at = null;
    if (!payload.expires_at) payload.expires_at = null;

    if (isNew.value) {
      const discount = await store.createDiscount(payload);
      router.push(`/admin/promotions/discounts/${discount.id}/edit`);
    } else {
      await store.updateDiscount(discountId.value!, payload);
    }
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  if (!isNew.value && discountId.value) {
    await store.fetchDiscount(discountId.value);
    if (store.selectedDiscount) {
      const d = store.selectedDiscount;
      form.name = d.name;
      form.slug = d.slug;
      form.discount_type = d.discount_type;
      form.value = d.value;
      form.currency = d.currency || 'EUR';
      form.scope = d.scope;
      form.min_order_amount = d.min_order_amount || '';
      form.max_discount_amount = d.max_discount_amount || '';
      form.max_uses = d.max_uses ? String(d.max_uses) : '';
      form.max_uses_per_user = d.max_uses_per_user ? String(d.max_uses_per_user) : '';
      form.priority = d.priority;
      form.starts_at = d.starts_at || '';
      form.expires_at = d.expires_at || '';
      form.is_active = d.is_active;
      form.stackable = d.stackable;
    }
  }
});
</script>

<style scoped>
.discount-form { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header__actions { display: flex; gap: 8px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-input { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
.form-input:focus { border-color: #3b82f6; outline: none; }
.mono { font-family: monospace; }
.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; background: white; }
.btn--primary { background: #3b82f6; color: white; border-color: #3b82f6; }
</style>
