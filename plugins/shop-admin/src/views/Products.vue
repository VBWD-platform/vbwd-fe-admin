<template>
  <div class="products-view">
    <div class="page-header">
      <h1>{{ $t('shop.products.title') || 'Products' }}</h1>
      <div class="header-actions">
        <ImportExportControls
          v-if="showImportExport"
          :api="dataExchangeApi"
          entity-key="shop_products"
          :selected-ids="selectedProductIds"
          :can-export="productsCaps.can_export"
          :can-import="productsCaps.can_import"
          :can-export-pii="productsCaps.can_export_pii"
          :is-superadmin="isSuperadmin"
          :supported-formats="productsCaps.supported_formats"
          @refresh="store.fetchProducts"
        />
        <router-link
          v-if="canManage"
          to="/admin/shop/products/new"
          class="btn btn--primary"
          data-testid="create-product-btn"
        >
          + New Product
        </router-link>
      </div>
    </div>

    <div
      v-if="selectedIds.size > 0"
      class="bulk-toolbar"
      data-testid="bulk-toolbar"
    >
      <span
        class="bulk-count"
        data-testid="bulk-selected-count"
      >
        {{ selectedIds.size }} selected
      </span>
      <button
        v-if="canManage"
        class="btn btn--sm btn--danger"
        data-testid="bulk-delete-btn"
        @click="handleBulkDelete"
      >
        Delete Selected
      </button>
      <button
        v-if="canManage"
        class="btn btn--sm btn--success"
        data-testid="bulk-activate-btn"
        @click="handleBulkActivate"
      >
        Activate
      </button>
      <button
        v-if="canManage"
        class="btn btn--sm btn--secondary"
        data-testid="bulk-deactivate-btn"
        @click="handleBulkDeactivate"
      >
        Deactivate
      </button>
      <button
        v-if="canManage"
        class="btn btn--sm btn--primary"
        data-testid="bulk-copy"
        @click="handleBulkCopy"
      >
        {{ $t('shop.makeACopy', 'Make a copy') }}
      </button>
      <button
        v-if="canManage"
        class="btn btn--sm btn--secondary"
        data-testid="bulk-assign-category-btn"
        @click="toggleCategoryPicker"
      >
        {{ $t('shop.bulk.assignCategory', 'Assign category') }}
      </button>
      <button
        v-if="canManage"
        class="btn btn--sm btn--secondary"
        data-testid="bulk-assign-tags-btn"
        @click="toggleTagsPicker"
      >
        {{ $t('shop.bulk.assignTags', 'Assign tags') }}
      </button>

      <!-- Category picker: one category + add/replace, plus an unassign affordance. -->
      <div
        v-if="canManage && showCategoryPicker"
        class="bulk-picker"
        data-testid="bulk-category-picker"
      >
        <select
          v-model="categoryPickId"
          class="bulk-picker__control"
          data-testid="bulk-category-select"
        >
          <option value="">
            {{ $t('shop.bulk.chooseCategory', 'Choose a category…') }}
          </option>
          <option
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
          >
            {{ category.name }}
          </option>
        </select>
        <select
          v-model="categoryMode"
          class="bulk-picker__control"
          data-testid="bulk-category-mode"
        >
          <option value="add">
            {{ $t('shop.bulk.modeAdd', 'Add') }}
          </option>
          <option value="replace">
            {{ $t('shop.bulk.modeReplace', 'Replace') }}
          </option>
        </select>
        <button
          class="btn btn--sm btn--primary"
          :disabled="!categoryPickId"
          data-testid="bulk-category-confirm"
          @click="handleAssignCategory"
        >
          {{ $t('shop.bulk.apply', 'Apply') }}
        </button>
        <button
          class="btn btn--sm btn--danger"
          :disabled="!categoryPickId"
          data-testid="bulk-category-unassign"
          @click="handleUnassignCategory"
        >
          {{ $t('shop.bulk.remove', 'Remove') }}
        </button>
      </div>

      <!-- Tags picker: multi-select slugs + add/replace. -->
      <div
        v-if="canManage && showTagsPicker"
        class="bulk-picker"
        data-testid="bulk-tags-picker"
      >
        <label
          v-for="tag in tagOptions"
          :key="tag.slug"
          class="bulk-picker__tag"
        >
          <input
            type="checkbox"
            :checked="selectedTagSlugs.has(tag.slug)"
            :data-testid="`bulk-tag-${tag.slug}`"
            @change="toggleTagSlug(tag.slug)"
          >
          {{ tag.name }}
        </label>
        <select
          v-model="tagsMode"
          class="bulk-picker__control"
          data-testid="bulk-tags-mode"
        >
          <option value="add">
            {{ $t('shop.bulk.modeAdd', 'Add') }}
          </option>
          <option value="replace">
            {{ $t('shop.bulk.modeReplace', 'Replace') }}
          </option>
        </select>
        <button
          class="btn btn--sm btn--primary"
          :disabled="selectedTagSlugs.size === 0"
          data-testid="bulk-tags-confirm"
          @click="handleAssignTags"
        >
          {{ $t('shop.bulk.apply', 'Apply') }}
        </button>
      </div>
    </div>

    <p
      v-if="bulkResult"
      class="bulk-result"
      data-testid="bulk-result-message"
    >
      {{ $t('shop.bulk.updatedLabel', 'Updated') }}: {{ bulkResult.updated }} ·
      {{ $t('shop.bulk.skippedLabel', 'skipped') }}: {{ bulkResult.skipped }}
    </p>

    <div
      v-if="store.loading"
      class="loading"
      data-testid="products-loading"
    >
      Loading...
    </div>

    <div
      v-else-if="store.error"
      class="error"
      data-testid="products-error"
    >
      {{ store.error }}
    </div>

    <table
      v-else
      class="data-table"
      data-testid="products-table"
    >
      <thead>
        <tr>
          <th class="checkbox-col">
            <input
              type="checkbox"
              :checked="allSelected"
              data-testid="select-all-checkbox"
              @change="toggleAll"
            >
          </th>
          <th>Name</th>
          <th>SKU</th>
          <th>Price</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="product in store.products"
          :key="product.id"
          :data-testid="`product-row-${product.id}`"
          class="clickable-row"
          @click="$router.push(`/admin/shop/products/${product.id}/edit`)"
        >
          <td
            class="checkbox-col"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="selectedIds.has(product.id)"
              :data-testid="`select-product-${product.id}`"
              @change="toggleSelect(product.id)"
            >
          </td>
          <td>
            <div class="product-name-cell">
              <img
                v-if="product.primary_image_url"
                :src="product.primary_image_url"
                class="product-thumb"
                :alt="product.name"
              >
              {{ product.name }}
            </div>
          </td>
          <td>{{ product.sku || '—' }}</td>
          <td>{{ product.price }} {{ product.currency }}</td>
          <td>
            <span
              class="status-badge"
              :class="product.is_active ? 'active' : 'inactive'"
            >
              {{ product.is_active ? 'Active' : 'Draft' }}
            </span>
          </td>
          <td @click.stop>
            <button
              v-if="canManage"
              class="btn btn--sm btn--danger"
              @click="handleDelete(product.id)"
            >
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-if="!store.loading && store.products.length === 0"
      class="empty-state"
      data-testid="products-empty"
    >
      No products yet.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ImportExportControls } from 'vbwd-view-component';
import { useProductAdminStore, type BulkResult, type BulkAssignMode } from '../stores/productAdmin';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/api';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';
import { fetchApplicableTags, type CatalogTag } from '@/api/tagsCustomFieldsApi';

const store = useProductAdminStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('shop.products.manage'));
const selectedIds = reactive(new Set<string>());

// Options for the bulk category / tag pickers. Categories reuse the same admin
// endpoint the ProductCategories view lists from; tags reuse the shared catalog
// scoped to `shop_product` (same source the per-product TagPicker draws on).
interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}
const categories = ref<CategoryOption[]>([]);
const tagOptions = ref<CatalogTag[]>([]);

const showCategoryPicker = ref(false);
const showTagsPicker = ref(false);
const categoryPickId = ref('');
const categoryMode = ref<BulkAssignMode>('add');
const tagsMode = ref<BulkAssignMode>('add');
const selectedTagSlugs = reactive(new Set<string>());
const bulkResult = ref<BulkResult | null>(null);

// Import/Export controls. Capabilities come from the perm-filtered
// data-exchange manifest; the control hides when neither export nor import is
// permitted for `shop_products`.
const dataExchangeApi = createDataExchangeApi();
const isSuperadmin = computed(() => authStore.isSuperAdmin);
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const productsCaps = computed(() => capabilitiesFor('shop_products'));
const showImportExport = computed(
  () => productsCaps.value.can_export || productsCaps.value.can_import,
);
const selectedProductIds = computed(() => Array.from(selectedIds));

const allSelected = computed(() => {
  return store.products.length > 0 && store.products.every(product => selectedIds.has(product.id));
});

function toggleSelect(productId: string) {
  if (selectedIds.has(productId)) {
    selectedIds.delete(productId);
  } else {
    selectedIds.add(productId);
  }
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.clear();
  } else {
    store.products.forEach(product => selectedIds.add(product.id));
  }
}

async function handleDelete(productId: string) {
  if (confirm('Delete this product?')) {
    await store.deleteProduct(productId);
    selectedIds.delete(productId);
  }
}

async function handleBulkDelete() {
  const productIds = Array.from(selectedIds);
  if (!confirm(`Delete ${productIds.length} product(s)?`)) return;
  try {
    await api.post('/admin/shop/products/bulk-delete', { product_ids: productIds });
    selectedIds.clear();
    await store.fetchProducts();
  } catch (error) {
    console.error('Bulk delete failed:', error);
  }
}

async function handleBulkActivate() {
  const productIds = Array.from(selectedIds);
  try {
    await api.post('/admin/shop/products/bulk-activate', { product_ids: productIds });
    selectedIds.clear();
    await store.fetchProducts();
  } catch (error) {
    console.error('Bulk activate failed:', error);
  }
}

async function handleBulkDeactivate() {
  const productIds = Array.from(selectedIds);
  try {
    await api.post('/admin/shop/products/bulk-deactivate', { product_ids: productIds });
    selectedIds.clear();
    await store.fetchProducts();
  } catch (error) {
    console.error('Bulk deactivate failed:', error);
  }
}

async function handleBulkCopy() {
  const productIds = Array.from(selectedIds);
  try {
    await store.bulkCopyProducts(productIds);
    selectedIds.clear();
    await store.fetchProducts();
  } catch (error) {
    console.error('Bulk copy failed:', error);
  }
}

function toggleCategoryPicker() {
  showCategoryPicker.value = !showCategoryPicker.value;
  showTagsPicker.value = false;
}

function toggleTagsPicker() {
  showTagsPicker.value = !showTagsPicker.value;
  showCategoryPicker.value = false;
}

function toggleTagSlug(slug: string) {
  if (selectedTagSlugs.has(slug)) {
    selectedTagSlugs.delete(slug);
  } else {
    selectedTagSlugs.add(slug);
  }
}

function resetBulkPickers() {
  selectedIds.clear();
  selectedTagSlugs.clear();
  categoryPickId.value = '';
  categoryMode.value = 'add';
  tagsMode.value = 'add';
  showCategoryPicker.value = false;
  showTagsPicker.value = false;
}

async function handleAssignCategory() {
  if (!categoryPickId.value) return;
  const productIds = Array.from(selectedIds);
  try {
    bulkResult.value = await store.bulkAssignCategory(
      productIds,
      categoryPickId.value,
      categoryMode.value,
    );
    resetBulkPickers();
    await store.fetchProducts();
  } catch (error) {
    console.error('Bulk assign category failed:', error);
  }
}

async function handleUnassignCategory() {
  if (!categoryPickId.value) return;
  const productIds = Array.from(selectedIds);
  try {
    bulkResult.value = await store.bulkUnassignCategory(productIds, categoryPickId.value);
    resetBulkPickers();
    await store.fetchProducts();
  } catch (error) {
    console.error('Bulk unassign category failed:', error);
  }
}

async function handleAssignTags() {
  if (selectedTagSlugs.size === 0) return;
  const productIds = Array.from(selectedIds);
  const tagSlugs = Array.from(selectedTagSlugs);
  try {
    bulkResult.value = await store.bulkAssignTags(productIds, tagSlugs, tagsMode.value);
    resetBulkPickers();
    await store.fetchProducts();
  } catch (error) {
    console.error('Bulk assign tags failed:', error);
  }
}

async function loadBulkOptions() {
  try {
    const response = await api.get('/admin/shop/categories') as { categories?: CategoryOption[] };
    categories.value = response.categories ?? [];
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
  try {
    tagOptions.value = await fetchApplicableTags('shop_product');
  } catch (error) {
    console.error('Failed to load tags:', error);
  }
}

onMounted(() => {
  store.fetchProducts();
  loadManifest();
  loadBulkOptions();
});
</script>

<style scoped>
.products-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.bulk-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 10px 15px; background: #eef2ff; border-radius: 6px; margin-bottom: 16px; }
.bulk-count { font-size: 14px; font-weight: 600; color: #4338ca; }
.bulk-picker { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; flex-basis: 100%; padding-top: 8px; border-top: 1px solid #c7d2fe; }
.bulk-picker__control { padding: 4px 8px; border: 1px solid #c7d2fe; border-radius: 4px; font-size: 13px; background: white; }
.bulk-picker__tag { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #4338ca; }
.bulk-result { margin: -8px 0 16px; font-size: 13px; font-weight: 600; color: #4338ca; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.checkbox-col { width: 40px; text-align: center !important; }
.clickable-row { cursor: pointer; }
.clickable-row:hover td { background: #f8f9fa; }
.product-name-cell { display: flex; align-items: center; gap: 10px; }
.product-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
.status-badge { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.status-badge.active { background: #d4edda; color: #155724; }
.status-badge.inactive { background: #f8d7da; color: #721c24; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; }
.btn--primary { background: #3b82f6; color: white; }
.btn--sm { padding: 4px 8px; font-size: 12px; }
.btn--danger { background: #ef4444; color: white; }
.btn--success { background: #22c55e; color: white; }
.btn--secondary { background: #6b7280; color: white; }
.empty-state { text-align: center; padding: 40px; color: #666; }
.loading, .error { padding: 20px; text-align: center; }
.error { color: #dc2626; }
</style>
