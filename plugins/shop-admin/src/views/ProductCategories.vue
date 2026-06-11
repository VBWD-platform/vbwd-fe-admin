<template>
  <div
    class="categories-view"
    data-testid="product-categories"
  >
    <div class="page-header">
      <h1>Product Categories</h1>
      <div class="header-actions">
        <ImportExportControls
          v-if="showImportExport"
          :api="dataExchangeApi"
          entity-key="shop_product_categories"
          :selected-ids="selectedCategoryIds"
          :can-export="categoriesCaps.can_export"
          :can-import="categoriesCaps.can_import"
          :can-export-pii="categoriesCaps.can_export_pii"
          :is-superadmin="isSuperadmin"
          :supported-formats="categoriesCaps.supported_formats"
          @refresh="fetchCategories"
        />
        <button
          v-if="canManage"
          class="btn btn--primary"
          data-testid="create-category-btn"
          @click="showForm = !showForm"
        >
          {{ showForm ? 'Cancel' : '+ Create Category' }}
        </button>
      </div>
    </div>

    <div
      v-if="showForm"
      class="category-form"
      data-testid="category-form"
    >
      <div class="form-row">
        <div class="form-group">
          <label for="category-name">Name</label>
          <input
            id="category-name"
            v-model="formData.name"
            type="text"
            placeholder="Category name"
            data-testid="category-name-input"
            @input="autoSlug"
          >
        </div>
        <div class="form-group">
          <label for="category-slug">Slug</label>
          <input
            id="category-slug"
            v-model="formData.slug"
            type="text"
            placeholder="category-slug"
            data-testid="category-slug-input"
          >
        </div>
        <div class="form-group">
          <label for="category-parent">Parent</label>
          <select
            id="category-parent"
            v-model="formData.parent_id"
            data-testid="category-parent-select"
          >
            <option :value="null">
              None (top-level)
            </option>
            <option
              v-for="category in categories.filter(c => c.id !== editingId)"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>
        <button
          v-if="canManage"
          class="btn btn--primary form-submit"
          data-testid="category-submit-btn"
          @click="handleSubmit"
        >
          {{ editingId ? 'Update' : 'Create' }}
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="loading"
      data-testid="categories-loading"
    >
      Loading...
    </div>

    <div
      v-else-if="error"
      class="error"
      data-testid="categories-error"
    >
      {{ error }}
    </div>

    <table
      v-else-if="categories.length > 0"
      class="data-table"
      data-testid="categories-table"
    >
      <thead>
        <tr>
          <th class="checkbox-col">
            <input
              type="checkbox"
              :checked="allSelected"
              data-testid="select-all-categories"
              @change="toggleAll"
            >
          </th>
          <th>Name</th>
          <th>Slug</th>
          <th>Parent</th>
          <th>Product Count</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="category in categories"
          :key="category.id"
          :data-testid="`category-row-${category.id}`"
        >
          <td class="checkbox-col">
            <input
              type="checkbox"
              :checked="selectedIds.has(category.id)"
              :data-testid="`select-category-${category.id}`"
              @change="toggleSelect(category.id)"
            >
          </td>
          <td>{{ category.name }}</td>
          <td><code>{{ category.slug }}</code></td>
          <td>{{ getParentName(category.parent_id) }}</td>
          <td>{{ category.product_count ?? 0 }}</td>
          <td>
            <button
              v-if="canManage"
              class="btn btn--sm btn--secondary"
              :data-testid="`edit-category-${category.id}`"
              @click="startEdit(category)"
            >
              Edit
            </button>
            <button
              v-if="canManage"
              class="btn btn--sm btn--danger"
              :data-testid="`delete-category-${category.id}`"
              @click="handleDelete(category.id)"
            >
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-else
      class="empty-state"
      data-testid="categories-empty"
    >
      No categories yet.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ImportExportControls } from 'vbwd-view-component';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/api';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';

const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('shop.categories.manage'));

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  product_count: number;
}

const categories = ref<ProductCategory[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showForm = ref(false);
const editingId = ref<string | null>(null);

// Row selection (for "export selected").
const selectedIds = reactive(new Set<string>());
const allSelected = computed(
  () => categories.value.length > 0 && categories.value.every(c => selectedIds.has(c.id)),
);
const selectedCategoryIds = computed(() => Array.from(selectedIds));

function toggleSelect(categoryId: string) {
  if (selectedIds.has(categoryId)) {
    selectedIds.delete(categoryId);
  } else {
    selectedIds.add(categoryId);
  }
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.clear();
  } else {
    categories.value.forEach(c => selectedIds.add(c.id));
  }
}

// Import/Export controls. Capabilities come from the perm-filtered
// data-exchange manifest; the control hides when neither export nor import is
// permitted for `shop_product_categories`.
const dataExchangeApi = createDataExchangeApi();
const isSuperadmin = computed(() => authStore.isSuperAdmin);
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const categoriesCaps = computed(() => capabilitiesFor('shop_product_categories'));
const showImportExport = computed(
  () => categoriesCaps.value.can_export || categoriesCaps.value.can_import,
);

const formData = reactive({
  name: '',
  slug: '',
  parent_id: null as string | null,
});

function autoSlug() {
  if (!editingId.value) {
    formData.slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

function resetForm() {
  formData.name = '';
  formData.slug = '';
  formData.parent_id = null;
  editingId.value = null;
}

function getParentName(parentId: string | null): string {
  if (!parentId) return '—';
  const parent = categories.value.find(category => category.id === parentId);
  return parent ? parent.name : '—';
}

function startEdit(category: ProductCategory) {
  editingId.value = category.id;
  formData.name = category.name;
  formData.slug = category.slug;
  formData.parent_id = category.parent_id;
  showForm.value = true;
}

async function fetchCategories() {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get('/admin/shop/categories') as { categories: ProductCategory[] };
    categories.value = response.categories;
  } catch (fetchError) {
    error.value = (fetchError as Error).message;
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  try {
    if (editingId.value) {
      await api.put(`/admin/shop/categories/${editingId.value}`, {
        name: formData.name,
        slug: formData.slug,
        parent_id: formData.parent_id,
      });
    } else {
      await api.post('/admin/shop/categories', {
        name: formData.name,
        slug: formData.slug,
        parent_id: formData.parent_id,
      });
    }
    resetForm();
    showForm.value = false;
    await fetchCategories();
  } catch (submitError) {
    error.value = (submitError as Error).message;
  }
}

async function handleDelete(categoryId: string) {
  if (!confirm('Delete this category?')) return;
  try {
    await api.delete(`/admin/shop/categories/${categoryId}`);
    await fetchCategories();
  } catch (deleteError) {
    error.value = (deleteError as Error).message;
  }
}

onMounted(() => {
  fetchCategories();
  loadManifest();
});
</script>

<style scoped>
.categories-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.checkbox-col { width: 40px; text-align: center !important; }
.category-form { background: #f8f9fa; padding: 16px; border-radius: 6px; margin-bottom: 20px; }
.form-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.form-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 160px; }
.form-group label { font-size: 12px; font-weight: 600; color: #374151; }
.form-group input,
.form-group select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
.form-submit { white-space: nowrap; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.data-table code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; }
.btn--primary { background: #3b82f6; color: white; }
.btn--sm { padding: 4px 8px; font-size: 12px; margin-right: 4px; }
.btn--danger { background: #ef4444; color: white; }
.btn--secondary { background: #6b7280; color: white; }
.empty-state { text-align: center; padding: 40px; color: #666; }
.loading, .error { padding: 20px; text-align: center; }
.error { color: #dc2626; }
</style>
