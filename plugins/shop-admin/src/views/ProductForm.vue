<template>
  <div
    class="product-form-view"
    data-testid="product-form"
  >
    <div class="page-header">
      <h1>{{ isEditMode ? 'Edit Product' : 'Create Product' }}</h1>
      <router-link
        to="/admin/shop/products"
        class="btn btn--secondary"
        data-testid="back-to-products-btn"
      >
        Back to Products
      </router-link>
    </div>

    <div
      v-if="store.loading && isEditMode"
      class="loading"
      data-testid="product-form-loading"
    >
      Loading...
    </div>

    <div
      v-else-if="store.error"
      class="error"
      data-testid="product-form-error"
    >
      {{ store.error }}
    </div>

    <template v-else>
      <!-- Tabs -->
      <div
        class="tabs"
        data-testid="product-tabs"
      >
        <button
          v-for="tab in allTabs"
          :key="tab.id"
          class="tab"
          :class="{ 'tab--active': activeTab === tab.id }"
          :data-testid="`tab-${tab.id}`"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- General Tab -->
      <form
        v-show="activeTab === 'general'"
        class="form-section"
        data-testid="tab-general-content"
        @submit.prevent="handleSubmit"
      >
        <div class="form-grid">
          <div class="form-group">
            <label>Name</label>
            <input
              v-model="form.name"
              type="text"
              required
              data-testid="product-name-input"
            >
          </div>
          <div class="form-group">
            <label>Slug</label>
            <input
              v-model="form.slug"
              type="text"
              data-testid="product-slug-input"
            >
          </div>
          <div class="form-group">
            <label>SKU</label>
            <input
              v-model="form.sku"
              type="text"
              data-testid="product-sku-input"
            >
          </div>
          <div class="form-group">
            <label>Price</label>
            <input
              v-model="form.price"
              type="number"
              step="0.01"
              required
              data-testid="product-price-input"
            >
          </div>
          <div class="form-group">
            <label>Currency</label>
            <input
              v-model="form.currency"
              type="text"
              data-testid="product-currency-input"
            >
          </div>
          <div class="form-group">
            <label>Weight (kg)</label>
            <input
              v-model="form.weight"
              type="number"
              step="0.001"
              data-testid="product-weight-input"
            >
          </div>
          <div class="form-group">
            <label>Tax Class</label>
            <select
              v-model="form.tax_class"
              data-testid="product-tax-class-input"
            >
              <option value="standard">
                Standard
              </option>
              <option value="reduced">
                Reduced
              </option>
              <option value="zero">
                Zero
              </option>
            </select>
          </div>
          <div class="form-group full-width">
            <label>Description</label>
            <textarea
              v-model="form.description"
              rows="4"
              data-testid="product-description-input"
            />
          </div>
          <div class="form-group">
            <label><input
              v-model="form.is_active"
              type="checkbox"
            > Active</label>
          </div>
          <div class="form-group">
            <label><input
              v-model="form.is_digital"
              type="checkbox"
            > Digital Product</label>
          </div>
        </div>
        <div class="form-actions">
          <button
            v-if="canManage"
            type="submit"
            class="btn btn--primary"
            data-testid="product-submit-btn"
          >
            {{ isEditMode ? 'Update Product' : 'Create Product' }}
          </button>
        </div>
      </form>

      <!-- Stock Tab -->
      <div
        v-show="activeTab === 'stock'"
        class="form-section"
        data-testid="tab-stock-content"
      >
        <p
          v-if="!isEditMode"
          class="hint"
        >
          Save the product first to manage stock.
        </p>
        <div v-else>
          <h3>Stock Levels</h3>

          <!-- Add stock for a warehouse -->
          <div
            v-if="availableWarehouses.length > 0"
            class="stock-add-row"
          >
            <select
              v-model="newStockWarehouseId"
              class="stock-select"
            >
              <option value="">
                — Select warehouse —
              </option>
              <option
                v-for="wh in availableWarehouses"
                :key="wh.id"
                :value="wh.id"
              >
                {{ wh.name }}
              </option>
            </select>
            <input
              v-model.number="newStockQuantity"
              type="number"
              min="0"
              placeholder="Quantity"
              class="stock-input"
            >
            <button
              v-if="canManage"
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="!newStockWarehouseId || newStockQuantity < 0"
              @click="addStock"
            >
              Add Stock
            </button>
          </div>

          <p
            v-if="stockItems.length === 0"
            class="hint"
          >
            No stock records yet.
          </p>
          <table
            v-else
            class="data-table"
          >
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Quantity</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(stock, index) in stockItems"
                :key="index"
              >
                <td>{{ stock.warehouse_name || stock.warehouse_id }}</td>
                <td>
                  <input
                    v-model.number="stock.quantity"
                    type="number"
                    min="0"
                    class="stock-inline-input"
                    @change="updateStock(stock)"
                  >
                </td>
                <td>{{ stock.reserved || 0 }}</td>
                <td>{{ Number(stock.quantity || 0) - Number(stock.reserved || 0) }}</td>
                <td>
                  <button
                    type="button"
                    class="btn btn--sm"
                    :disabled="stockSaving"
                    @click="updateStock(stock)"
                  >
                    {{ stockSaving ? '...' : 'Save' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Images Tab -->
      <div
        v-show="activeTab === 'images'"
        class="form-section"
        data-testid="tab-images-content"
      >
        <p
          v-if="!isEditMode"
          class="hint"
        >
          Save the product first to manage images.
        </p>
        <ProductImageGallery
          v-else-if="productId"
          :product-id="productId"
        />
      </div>

      <!-- Categories Tab -->
      <div
        v-show="activeTab === 'categories'"
        class="form-section"
        data-testid="tab-categories-content"
      >
        <p
          v-if="!isEditMode"
          class="hint"
        >
          Save the product first to assign categories.
        </p>
        <div
          v-else
          class="categories-section"
        >
          <h3>Categories</h3>
          <div class="categories-panels">
            <div class="category-panel">
              <h4>Available</h4>
              <div
                class="category-list"
                data-testid="available-categories"
              >
                <div
                  v-for="cat in availableCategories"
                  :key="cat.id"
                  class="category-item"
                  :data-testid="`available-category-${cat.id}`"
                >
                  <span>{{ cat.name }}</span>
                  <button
                    type="button"
                    class="assign-btn"
                    @click="assignCategory(cat.id)"
                  >
                    +
                  </button>
                </div>
                <p
                  v-if="availableCategories.length === 0"
                  class="empty-hint"
                >
                  All categories assigned.
                </p>
              </div>
            </div>
            <div class="category-panel">
              <h4>Assigned</h4>
              <div
                class="category-list"
                data-testid="assigned-categories"
              >
                <div
                  v-for="cat in assignedCategories"
                  :key="cat.id"
                  class="category-item"
                  :data-testid="`assigned-category-${cat.id}`"
                >
                  <span>{{ cat.name }}</span>
                  <button
                    type="button"
                    class="unassign-btn"
                    @click="unassignCategory(cat.id)"
                  >
                    &times;
                  </button>
                </div>
                <p
                  v-if="assignedCategories.length === 0"
                  class="empty-hint"
                >
                  No categories assigned.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Plugin extension tabs -->
      <div
        v-for="pluginTab in pluginTabs"
        v-show="activeTab === pluginTab.id"
        :key="pluginTab.id"
        class="form-section"
        :data-testid="`tab-${pluginTab.id}-content`"
      >
        <component
          :is="pluginTab.component"
          :product-id="productId"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProductAdminStore } from '../stores/productAdmin';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/api';
import { extensionRegistry } from '../../../../vue/src/plugins/extensionRegistry';
import ProductImageGallery from '../components/ProductImageGallery.vue';

const route = useRoute();
const router = useRouter();
const store = useProductAdminStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('shop.products.manage'));

const productId = computed(() => route.params.id as string | undefined);
const isEditMode = computed(() => !!productId.value && productId.value !== 'new');
const activeTab = ref('general');

const form = reactive({
  name: '',
  slug: '',
  sku: '',
  price: '',
  currency: 'EUR',
  description: '',
  is_active: true,
  is_digital: false,
  weight: '',
  tax_class: 'standard',
});

// Stock data
const stockItems = ref<Array<Record<string, unknown>>>([]);
const allWarehouses = ref<Array<{ id: string; name: string }>>([]);
const newStockWarehouseId = ref('');
const newStockQuantity = ref(0);
const stockSaving = ref(false);

const availableWarehouses = computed(() => {
  const usedIds = new Set(stockItems.value.map(s => String(s.warehouse_id)));
  return allWarehouses.value.filter(w => !usedIds.has(w.id));
});

async function loadWarehouses() {
  try {
    const response = await api.get('/admin/shop/warehouses') as { warehouses: Array<{ id: string; name: string }> };
    allWarehouses.value = response.warehouses || [];
  } catch {
    // Not critical
  }
}

async function updateStock(stock: Record<string, unknown>) {
  stockSaving.value = true;
  try {
    await api.put(`/admin/shop/stock/${productId.value}`, {
      warehouse_id: stock.warehouse_id,
      quantity: stock.quantity,
    });
  } catch {
    // Revert on failure
  } finally {
    stockSaving.value = false;
  }
}

async function addStock() {
  if (!newStockWarehouseId.value || !productId.value) return;
  stockSaving.value = true;
  try {
    await api.put(`/admin/shop/stock/${productId.value}`, {
      warehouse_id: newStockWarehouseId.value,
      quantity: newStockQuantity.value,
    });
    // Reload stock
    const stockResponse = await api.get('/admin/shop/stock') as { stock: Array<Record<string, unknown>> };
    stockItems.value = stockResponse.stock.filter(
      (s: Record<string, unknown>) => s.product_id === productId.value
    );
    newStockWarehouseId.value = '';
    newStockQuantity.value = 0;
  } catch {
    // Error
  } finally {
    stockSaving.value = false;
  }
}

// Categories
interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}
const allCategories = ref<CategoryOption[]>([]);
const assignedCategoryIds = ref<string[]>([]);

const availableCategories = computed(() =>
  allCategories.value.filter(c => !assignedCategoryIds.value.includes(c.id))
);
const assignedCategories = computed(() =>
  allCategories.value.filter(c => assignedCategoryIds.value.includes(c.id))
);

// Core tabs
const coreTabs = [
  { id: 'general', label: 'General' },
  { id: 'stock', label: 'Stock' },
  { id: 'images', label: 'Images' },
  { id: 'categories', label: 'Categories' },
];

// Plugin extension tabs
const pluginTabs = computed((): Array<{ id: string; label: string; component: unknown }> => {
  const ext = extensionRegistry.get('shop-admin');
  if (!ext) return [];
  return ((ext as Record<string, unknown>).productTabSections as Array<{ id: string; label: string; component: unknown }>) || [];
});

const allTabs = computed(() => [...coreTabs, ...pluginTabs.value]);

async function fetchProduct() {
  if (!isEditMode.value || !productId.value) return;
  await store.fetchProduct(productId.value);
  if (store.selectedProduct) {
    const product = store.selectedProduct;
    form.name = product.name;
    form.slug = product.slug;
    form.sku = product.sku || '';
    form.price = product.price;
    form.currency = product.currency || 'EUR';
    form.description = product.description || '';
    form.is_active = product.is_active;
    form.is_digital = product.is_digital;
    form.weight = product.weight || '';
    form.tax_class = product.tax_class || 'standard';

    // Load assigned categories
    if (product.categories) {
      assignedCategoryIds.value = product.categories.map((c: CategoryOption) => c.id);
    }
  }

  // Load stock for this product
  try {
    const stockResponse = await api.get('/admin/shop/stock') as { stock: Array<Record<string, unknown>> };
    stockItems.value = stockResponse.stock.filter(
      (s: Record<string, unknown>) => s.product_id === productId.value
    );
  } catch {
    // Stock not critical
  }
}

async function fetchCategories() {
  try {
    const response = await api.get('/admin/shop/categories') as { categories: CategoryOption[] };
    allCategories.value = response.categories || [];
  } catch {
    // Categories not critical
  }
}

function assignCategory(categoryId: string) {
  if (!assignedCategoryIds.value.includes(categoryId)) {
    assignedCategoryIds.value.push(categoryId);
    // TODO: call API to persist assignment
  }
}

function unassignCategory(categoryId: string) {
  assignedCategoryIds.value = assignedCategoryIds.value.filter(id => id !== categoryId);
  // TODO: call API to persist removal
}

async function handleSubmit() {
  const data: Record<string, unknown> = {
    ...form,
    price: parseFloat(form.price) || 0,
    weight: form.weight ? parseFloat(form.weight) : null,
  };

  try {
    if (isEditMode.value && productId.value) {
      await store.updateProduct(productId.value, data);
    } else {
      const product = await store.createProduct(data);
      if (product) {
        router.push(`/admin/shop/products/${product.id}/edit`);
      }
    }
  } catch {
    // Error handled by store
  }
}

onMounted(() => {
  fetchCategories();
  fetchProduct();
  loadWarehouses();
});
</script>

<style scoped>
.product-form-view { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tabs { display: flex; border-bottom: 2px solid #e5e7eb; margin-bottom: 20px; gap: 0; }
.tab { padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 14px; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab--active { color: #3b82f6; border-bottom-color: #3b82f6; font-weight: 600; }
.tab:hover { color: #1d4ed8; }
.form-section { padding: 10px 0; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-group input[type="text"],
.form-group input[type="number"],
.form-group select,
.form-group textarea { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
.form-group input[type="text"]:focus,
.form-group input[type="number"]:focus,
.form-group select:focus,
.form-group textarea:focus { border-color: #3498db; outline: none; }
.form-actions { margin-top: 20px; display: flex; gap: 10px; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; }
.btn--primary { background: #3b82f6; color: white; }
.btn--secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.hint { color: #6b7280; font-size: 14px; padding: 20px 0; }
.loading, .error { padding: 20px; text-align: center; }
.error { color: #dc2626; }

/* ── Categories (PlanForm style) ─────────────────────── */

.categories-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.categories-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.category-panel h4 {
  margin: 0 0 10px 0;
  color: #555;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-list {
  border: 1px solid #e9ecef;
  border-radius: 4px;
  min-height: 100px;
  max-height: 250px;
  overflow-y: auto;
  padding: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.category-item:hover {
  background: #f8f9fa;
}

.category-item span:first-child {
  flex: 1;
}

.assign-btn,
.unassign-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.assign-btn {
  background: #d4edda;
  color: #155724;
}

.assign-btn:hover {
  background: #c3e6cb;
}

.unassign-btn {
  background: #f8d7da;
  color: #721c24;
}

.unassign-btn:hover {
  background: #f5c6cb;
}

.empty-hint {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px 0;
}

/* Stock editing */
.stock-add-row { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; }
.stock-select { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; min-width: 180px; }
.stock-input { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 100px; }
.stock-inline-input { padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 80px; text-align: right; }
.btn--sm { padding: 4px 10px; font-size: 12px; }
</style>
