<template>
  <div class="shipping-view">
    <div class="page-header">
      <h1>Shipping Methods</h1>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      Loading...
    </div>

    <table
      v-else-if="methods.length > 0"
      class="data-table"
    >
      <thead>
        <tr>
          <th>Method</th>
          <th>Type</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="method in methods"
          :key="method.slug"
        >
          <td>
            <strong>{{ method.name }}</strong>
            <span class="slug-hint">{{ method.slug }}</span>
          </td>
          <td>
            <span
              class="badge"
              :class="method.is_builtin ? 'badge--blue' : 'badge--purple'"
            >
              {{ method.is_builtin ? 'Built-in' : 'Plugin' }}
            </span>
          </td>
          <td>
            <span
              class="badge"
              :class="method.enabled ? 'badge--green' : 'badge--gray'"
            >
              {{ method.enabled ? 'Active' : 'Disabled' }}
            </span>
          </td>
          <td>
            <button
              v-if="!method.is_builtin"
              class="btn btn--sm"
              :disabled="toggling"
              @click="toggleMethod(method.slug, !method.enabled)"
            >
              {{ method.enabled ? 'Disable' : 'Enable' }}
            </button>
            <router-link
              v-if="!method.is_builtin"
              :to="`/admin/settings/backend-plugins/${method.slug}`"
              class="btn btn--sm btn--ghost"
            >
              Configure
            </router-link>
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-else
      class="empty"
    >
      No shipping methods available.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api';

interface ShippingMethod {
  slug: string;
  name: string;
  enabled: boolean;
  is_builtin: boolean;
}

const loading = ref(true);
const toggling = ref(false);
const methods = ref<ShippingMethod[]>([]);

async function load() {
  loading.value = true;
  try {
    const res = await api.get('/admin/shop/shipping/methods') as { methods: ShippingMethod[] };
    methods.value = res.methods;
  } finally {
    loading.value = false;
  }
}

async function toggleMethod(slug: string, enabled: boolean) {
  toggling.value = true;
  try {
    await api.post(`/admin/shop/shipping/methods/${slug}/toggle`, { enabled });
    await load();
  } finally {
    toggling.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.shipping-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { margin-bottom: 20px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.slug-hint { display: block; font-size: 0.75rem; color: #9ca3af; font-family: monospace; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
.badge--green { background: #d4edda; color: #155724; }
.badge--gray { background: #e9ecef; color: #6c757d; }
.badge--blue { background: #cce5ff; color: #004085; }
.badge--purple { background: #ede7f6; color: #4527a0; }
.btn { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 13px; background: white; text-decoration: none; }
.btn--sm { padding: 4px 8px; font-size: 12px; }
.btn--ghost { color: #3b82f6; border-color: transparent; }
.loading, .empty { padding: 40px; text-align: center; color: #6b7280; }
</style>
