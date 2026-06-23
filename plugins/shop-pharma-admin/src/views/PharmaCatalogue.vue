<template>
  <div class="pharma-catalogue">
    <div class="page-header">
      <h1>{{ $t('pharma.catalogue.title') || 'Pharmacy catalogue' }}</h1>
      <router-link
        v-if="canManage"
        to="/admin/pharma/products/new"
        class="btn btn--primary"
        data-testid="pharma-create-product-btn"
      >
        + {{ $t('pharma.catalogue.newProduct') || 'New medicine / device' }}
      </router-link>
    </div>

    <div
      class="filters"
      data-testid="pharma-filters"
    >
      <input
        v-model="search"
        type="search"
        class="filter-input"
        :placeholder="$t('pharma.catalogue.searchPlaceholder') || 'Search by name or slug…'"
        data-testid="pharma-search"
      >
      <select
        v-model="classFilter"
        class="filter-input"
        data-testid="pharma-class-filter"
      >
        <option value="">
          {{ $t('pharma.catalogue.allClasses') || 'All classes' }}
        </option>
        <option
          v-for="klass in productClasses"
          :key="klass"
          :value="klass"
        >
          {{ classLabel(klass) }}
        </option>
      </select>
    </div>

    <p
      v-if="store.loading"
      class="loading"
      data-testid="pharma-loading"
    >
      Loading…
    </p>
    <p
      v-else-if="store.error"
      class="error"
      data-testid="pharma-error"
    >
      {{ store.error }}
    </p>

    <table
      v-else
      class="data-table"
      data-testid="pharma-products-table"
    >
      <thead>
        <tr>
          <th>{{ $t('pharma.catalogue.name') || 'Name' }}</th>
          <th>{{ $t('pharma.catalogue.class') || 'Class' }}</th>
          <th>{{ $t('pharma.catalogue.codeScheme') || nationalCodeLabel }}</th>
          <th>{{ $t('pharma.catalogue.price') || 'Price' }}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="product in filteredProducts"
          :key="product.id"
          class="clickable-row"
          :data-testid="`pharma-row-${product.slug}`"
          @click="openEditor(product.id)"
        >
          <td>
            <div class="product-name-cell">
              <img
                v-if="product.primary_image_url"
                :src="product.primary_image_url"
                class="product-thumb"
                :alt="product.name"
              >
              <span
                v-else
                class="product-thumb product-thumb--placeholder"
              >Rx</span>
              {{ product.name }}
            </div>
          </td>
          <td>
            <span
              class="class-badge"
              :class="`class-badge--${(product.pharma_profile?.product_class || 'na').toLowerCase()}`"
            >
              {{ classLabel(product.pharma_profile?.product_class) }}
            </span>
          </td>
          <td>{{ nationalCodeLabel }}</td>
          <td>{{ formatPrice(product.price) }}</td>
          <td>
            <button
              v-if="canManage"
              class="btn btn--sm btn--danger"
              :data-testid="`pharma-delete-${product.slug}`"
              @click.stop="handleDelete(product)"
            >
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-if="!store.loading && filteredProducts.length === 0"
      class="empty-state"
      data-testid="pharma-empty"
    >
      {{ $t('pharma.catalogue.empty') || 'No products match this filter.' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePharmaAdminStore } from '../stores/pharmaAdmin';
import { useAuthStore } from '@/stores/auth';
import {
  PRODUCT_CLASSES,
  PRODUCT_CLASS_META,
  type ProductClass,
} from '../pharmaFields';

const store = usePharmaAdminStore();
const authStore = useAuthStore();
const router = useRouter();

const search = ref('');
const classFilter = ref<'' | ProductClass>('');
const productClasses = PRODUCT_CLASSES;

const canManage = computed(() => authStore.hasPermission('pharma.manage'));

const nationalCodeLabel = computed(() => store.region?.national_code_scheme || 'National code');

const filteredProducts = computed(() => {
  const term = search.value.trim().toLowerCase();
  return store.products.filter((product) => {
    if (classFilter.value && product.pharma_profile?.product_class !== classFilter.value) {
      return false;
    }
    if (!term) return true;
    return (
      product.name.toLowerCase().includes(term) ||
      product.slug.toLowerCase().includes(term)
    );
  });
});

function classLabel(klass?: ProductClass | string | null): string {
  if (klass && klass in PRODUCT_CLASS_META) {
    return PRODUCT_CLASS_META[klass as ProductClass].label;
  }
  return klass || '—';
}

function formatPrice(value: number): string {
  const currency = store.region?.display_currency || 'EUR';
  return `${value.toFixed(2)} ${currency}`;
}

function openEditor(productId: string): void {
  router.push(`/admin/pharma/products/${productId}/edit`);
}

async function handleDelete(product: { id: string; name: string }): Promise<void> {
  if (!confirm(`Delete "${product.name}"?`)) return;
  await store.deleteProduct(product.id);
}

onMounted(() => {
  store.fetchRegion();
  store.fetchProducts();
});
</script>

<style scoped>
.pharma-catalogue { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.filters { display: flex; gap: 12px; margin-bottom: 16px; }
.filter-input { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; min-width: 200px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.clickable-row { cursor: pointer; }
.clickable-row:hover td { background: #f8f9fa; }
.product-name-cell { display: flex; align-items: center; gap: 10px; }
.product-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
.product-thumb--placeholder { display: inline-flex; align-items: center; justify-content: center; background: #e0e7ff; color: #4338ca; font-weight: 700; font-size: 12px; }
.class-badge { padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; background: #eef2ff; color: #4338ca; }
.class-badge--rx { background: #fee2e2; color: #991b1b; }
.class-badge--otc { background: #dcfce7; color: #166534; }
.class-badge--medical_device { background: #dbeafe; color: #1e40af; }
.class-badge--fmcg_personal { background: #fef9c3; color: #854d0e; }
.class-badge--fmcg_hospital { background: #f3e8ff; color: #6b21a8; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; }
.btn--primary { background: #3b82f6; color: white; }
.btn--sm { padding: 4px 8px; font-size: 12px; }
.btn--danger { background: #ef4444; color: white; }
.empty-state { text-align: center; padding: 40px; color: #666; }
.loading, .error { padding: 20px; text-align: center; }
.error { color: #dc2626; }
</style>
