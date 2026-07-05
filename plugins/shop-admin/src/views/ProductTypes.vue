<template>
  <div
    class="product-types-view"
    data-testid="product-types"
  >
    <div class="page-header">
      <h1>Product Types</h1>
      <button
        v-if="canManage"
        class="btn btn--primary"
        data-testid="create-product-type-btn"
        @click="startCreate"
      >
        + New Type
      </button>
    </div>

    <p class="intro-hint">
      A product type is a named cluster of extra fields layered on the base product.
      Types provided by a plugin are managed in code and shown read-only.
    </p>

    <!-- Create / edit form -->
    <div
      v-if="showForm"
      class="type-form"
      data-testid="product-type-form"
    >
      <div class="form-grid">
        <div class="form-group">
          <label>Slug</label>
          <input
            v-model="formData.slug"
            type="text"
            :disabled="isEditMode"
            placeholder="e.g. real_estate"
            data-testid="product-type-slug-input"
          >
        </div>
        <div class="form-group">
          <label>Name</label>
          <input
            v-model="formData.name"
            type="text"
            placeholder="e.g. Real estate"
            data-testid="product-type-name-input"
          >
        </div>
        <div class="form-group full-width">
          <label>Description</label>
          <textarea
            v-model="formData.description"
            rows="2"
            data-testid="product-type-description-input"
          />
        </div>
        <div class="form-group">
          <label><input
            v-model="formData.is_active"
            type="checkbox"
            data-testid="product-type-active-input"
          > Active</label>
        </div>
      </div>

      <h3>Fields</h3>
      <table
        v-if="formData.product_type_fields.length > 0"
        class="fields-table"
        data-testid="product-type-fields-editor"
      >
        <thead>
          <tr>
            <th>Slug</th>
            <th>Type</th>
            <th>Label</th>
            <th>Required</th>
            <th>Options (comma-separated)</th>
            <th>Order</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(fieldRow, index) in formData.product_type_fields"
            :key="index"
            :data-testid="`field-row-${index}`"
          >
            <td>
              <input
                v-model="fieldRow.slug"
                type="text"
                :data-testid="`field-slug-${index}`"
              >
            </td>
            <td>
              <select
                v-model="fieldRow.type"
                :data-testid="`field-type-${index}`"
              >
                <option
                  v-for="fieldType in FIELD_TYPES"
                  :key="fieldType"
                  :value="fieldType"
                >
                  {{ fieldType }}
                </option>
              </select>
            </td>
            <td>
              <input
                v-model="fieldRow.label"
                type="text"
                :data-testid="`field-label-${index}`"
              >
            </td>
            <td class="center">
              <input
                v-model="fieldRow.required"
                type="checkbox"
                :data-testid="`field-required-${index}`"
              >
            </td>
            <td>
              <input
                v-model="fieldRow.optionsText"
                type="text"
                placeholder="RX, OTC"
                :data-testid="`field-options-${index}`"
              >
            </td>
            <td>
              <input
                v-model.number="fieldRow.sort_order"
                type="number"
                class="order-input"
                :data-testid="`field-order-${index}`"
              >
            </td>
            <td>
              <button
                type="button"
                class="btn btn--sm btn--danger"
                :data-testid="`remove-field-row-${index}`"
                @click="removeFieldRow(index)"
              >
                &times;
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <button
        type="button"
        class="btn btn--sm btn--secondary"
        data-testid="add-field-row-btn"
        @click="addFieldRow"
      >
        + Add Field
      </button>

      <div class="form-actions">
        <button
          class="btn btn--primary"
          data-testid="product-type-submit-btn"
          @click="handleSubmit"
        >
          {{ isEditMode ? 'Update Type' : 'Create Type' }}
        </button>
        <button
          class="btn btn--secondary"
          data-testid="product-type-cancel-btn"
          @click="cancelForm"
        >
          Cancel
        </button>
      </div>
    </div>

    <div
      v-if="store.loading"
      class="loading"
      data-testid="product-types-loading"
    >
      Loading...
    </div>
    <div
      v-else-if="store.error"
      class="error"
      data-testid="product-types-error"
    >
      {{ store.error }}
    </div>

    <table
      v-else-if="store.productTypes.length > 0"
      class="data-table"
      data-testid="product-types-table"
    >
      <thead>
        <tr>
          <th>Name</th>
          <th>Slug</th>
          <th>Fields</th>
          <th>Source</th>
          <th>Active</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="productType in store.productTypes"
          :key="productType.slug"
          :data-testid="`product-type-row-${productType.slug}`"
        >
          <td>{{ productType.name }}</td>
          <td><code>{{ productType.slug }}</code></td>
          <td>{{ productType.product_type_fields.length }}</td>
          <td>
            <span
              v-if="productType.source === 'plugin'"
              class="badge badge--plugin"
              :data-testid="`product-type-managed-${productType.slug}`"
            >managed by plugin</span>
            <span
              v-else
              class="badge badge--admin"
            >admin</span>
          </td>
          <td>{{ productType.is_active ? 'Yes' : 'No' }}</td>
          <td>
            <template v-if="canManage && productType.source === 'admin'">
              <button
                class="btn btn--sm btn--secondary"
                :data-testid="`edit-product-type-${productType.slug}`"
                @click="startEdit(productType)"
              >
                Edit
              </button>
              <button
                class="btn btn--sm btn--danger"
                :data-testid="`delete-product-type-${productType.slug}`"
                @click="handleDelete(productType.slug)"
              >
                Delete
              </button>
            </template>
            <span
              v-else
              class="read-only-hint"
            >read-only</span>
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-else
      class="empty-state"
      data-testid="product-types-empty"
    >
      No product types yet.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import {
  useProductTypeAdminStore,
  type ProductType,
  type ProductTypeField,
} from '../stores/productTypeAdmin';

const FIELD_TYPES = [
  'string',
  'text',
  'textarea',
  'url',
  'integer',
  'number',
  'float',
  'decimal',
  'boolean',
  'select',
  'multiselect',
];

interface FieldRowDraft {
  slug: string;
  type: string;
  label: string;
  required: boolean;
  optionsText: string;
  help: string | null;
  sort_order: number;
}

const authStore = useAuthStore();
const store = useProductTypeAdminStore();
const canManage = computed(() => authStore.hasPermission('shop.products.manage'));

const showForm = ref(false);
const editingSlug = ref<string | null>(null);
const isEditMode = computed(() => editingSlug.value !== null);

const formData = reactive({
  slug: '',
  name: '',
  description: '',
  is_active: true,
  product_type_fields: [] as FieldRowDraft[],
});

function emptyFieldRow(sortOrder: number): FieldRowDraft {
  return {
    slug: '',
    type: 'string',
    label: '',
    required: false,
    optionsText: '',
    help: null,
    sort_order: sortOrder,
  };
}

function addFieldRow() {
  formData.product_type_fields.push(emptyFieldRow(formData.product_type_fields.length));
}

function removeFieldRow(index: number) {
  formData.product_type_fields.splice(index, 1);
}

function resetForm() {
  formData.slug = '';
  formData.name = '';
  formData.description = '';
  formData.is_active = true;
  formData.product_type_fields = [];
  editingSlug.value = null;
}

function startCreate() {
  resetForm();
  showForm.value = true;
}

function startEdit(productType: ProductType) {
  editingSlug.value = productType.slug;
  formData.slug = productType.slug;
  formData.name = productType.name;
  formData.description = productType.description || '';
  formData.is_active = productType.is_active;
  formData.product_type_fields = productType.product_type_fields.map(field => ({
    slug: field.slug,
    type: field.type,
    label: field.label,
    required: field.required,
    optionsText: (field.options || []).join(', '),
    help: field.help,
    sort_order: field.sort_order,
  }));
  showForm.value = true;
}

function cancelForm() {
  resetForm();
  showForm.value = false;
}

function toFieldDescriptors(): ProductTypeField[] {
  return formData.product_type_fields.map(row => ({
    slug: row.slug,
    type: row.type,
    label: row.label,
    required: row.required,
    options: row.optionsText
      .split(',')
      .map(option => option.trim())
      .filter(option => option.length > 0),
    help: row.help,
    sort_order: row.sort_order,
  }));
}

async function handleSubmit() {
  try {
    if (isEditMode.value && editingSlug.value) {
      await store.updateProductType(editingSlug.value, {
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active,
        product_type_fields: toFieldDescriptors(),
      });
    } else {
      await store.createProductType({
        slug: formData.slug,
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active,
        product_type_fields: toFieldDescriptors(),
      });
    }
    cancelForm();
    await store.fetchProductTypes();
  } catch {
    // Error surfaced via store.error
  }
}

async function handleDelete(slug: string) {
  if (!confirm('Delete this product type?')) return;
  try {
    await store.deleteProductType(slug);
  } catch {
    // Error surfaced via store.error
  }
}

onMounted(() => {
  store.fetchProductTypes();
});
</script>

<style scoped>
.product-types-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.intro-hint { color: #6b7280; font-size: 13px; margin: 0 0 20px 0; }
.type-form { background: #f8f9fa; padding: 16px; border-radius: 6px; margin-bottom: 20px; }
.type-form h3 { margin: 16px 0 8px 0; font-size: 14px; color: #374151; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-group input[type="text"],
.form-group textarea { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
.fields-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.fields-table th, .fields-table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
.fields-table th { font-weight: 600; color: #6b7280; }
.fields-table td.center { text-align: center; }
.fields-table input[type="text"],
.fields-table select { width: 100%; padding: 5px 7px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; }
.order-input { width: 60px; padding: 5px 7px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; }
.form-actions { margin-top: 16px; display: flex; gap: 10px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.data-table code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
.badge--plugin { background: #e0e7ff; color: #3730a3; }
.badge--admin { background: #d1fae5; color: #065f46; }
.read-only-hint { color: #9ca3af; font-size: 12px; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; }
.btn--primary { background: #3b82f6; color: white; }
.btn--secondary { background: #6b7280; color: white; }
.btn--danger { background: #ef4444; color: white; }
.btn--sm { padding: 4px 8px; font-size: 12px; margin-right: 4px; }
.empty-state { text-align: center; padding: 40px; color: #666; }
.loading, .error { padding: 20px; text-align: center; }
.error { color: #dc2626; }
</style>
