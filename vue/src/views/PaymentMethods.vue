<template>
  <div
    class="payment-methods-view"
    data-testid="payment-methods-view"
  >
    <div class="page-header">
      <h2>{{ $t('paymentMethods.title') }}</h2>
      <router-link
        v-if="canManage"
        to="/admin/payment-methods/new"
        class="btn btn-primary"
        data-testid="create-payment-method"
      >
        {{ $t('paymentMethods.createMethod') }}
      </router-link>
    </div>

    <div
      v-if="loading"
      class="loading-state"
    >
      {{ $t('common.loading') }}
    </div>

    <div
      v-else-if="error"
      class="error-state"
    >
      <p>{{ error }}</p>
      <button
        class="btn btn-secondary"
        @click="loadPaymentMethods"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <div
      v-else-if="paymentMethods.length === 0"
      class="empty-state"
    >
      <p>{{ $t('paymentMethods.noMethods') }}</p>
      <router-link
        v-if="canManage"
        to="/admin/payment-methods/new"
        class="btn btn-primary"
      >
        {{ $t('paymentMethods.createFirst') }}
      </router-link>
    </div>

    <!-- Bulk Actions -->
    <div
      v-if="canManage && selectedMethods.size > 0"
      class="bulk-actions"
      data-testid="bulk-actions"
    >
      <span class="selection-info">{{ $t('common.selected', { count: selectedMethods.size }) }}</span>
      <button
        class="bulk-btn activate"
        :disabled="processingBulk"
        data-testid="bulk-activate-btn"
        @click="handleBulkActivate"
      >
        {{ $t('paymentMethods.bulkActivate') }}
      </button>
      <button
        class="bulk-btn deactivate"
        :disabled="processingBulk"
        data-testid="bulk-deactivate-btn"
        @click="handleBulkDeactivate"
      >
        {{ $t('paymentMethods.bulkDeactivate') }}
      </button>
      <button
        class="bulk-btn delete"
        :disabled="processingBulk"
        data-testid="bulk-delete-btn"
        @click="handleBulkDelete"
      >
        {{ $t('paymentMethods.bulkDelete') }}
      </button>
    </div>

    <!-- Bulk Messages -->
    <div
      v-if="bulkSuccessMessage"
      class="bulk-message success"
      data-testid="bulk-success-message"
    >
      {{ bulkSuccessMessage }}
    </div>
    <div
      v-if="bulkErrorMessage"
      class="bulk-message error"
      data-testid="bulk-error-message"
    >
      {{ bulkErrorMessage }}
    </div>

    <table
      v-else
      class="data-table"
      data-testid="payment-methods-table"
    >
      <thead>
        <tr>
          <th class="checkbox-col">
            <input
              type="checkbox"
              :checked="allVisibleSelected && sortedMethods.length > 0"
              :indeterminate="selectedMethods.size > 0 && !allVisibleSelected"
              data-testid="select-all-checkbox"
              @change="toggleSelectAll"
            >
          </th>
          <th>{{ $t('paymentMethods.position') }}</th>
          <th>{{ $t('paymentMethods.code') }}</th>
          <th>{{ $t('paymentMethods.name') }}</th>
          <th>{{ $t('paymentMethods.feeType') }}</th>
          <th>{{ $t('common.status') }}</th>
          <th>{{ $t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="method in sortedMethods"
          :key="method.id"
          :class="{ selected: selectedMethods.has(method.id) }"
        >
          <td
            class="checkbox-col"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="selectedMethods.has(method.id)"
              :data-testid="`select-method-${method.id}`"
              @change="toggleMethod(method.id)"
            >
          </td>
          <td>{{ method.position }}</td>
          <td>
            <code>{{ method.code }}</code>
          </td>
          <td>
            {{ method.name }}
            <span
              v-if="method.is_default"
              class="badge badge-default"
              data-testid="default-badge"
            >
              {{ $t('paymentMethods.isDefault') }}
            </span>
          </td>
          <td>
            <span v-if="method.fee_type === 'none'">
              {{ $t('paymentMethods.feeTypes.none') }}
            </span>
            <span v-else-if="method.fee_type === 'fixed'">
              {{ $t('paymentMethods.feeTypes.fixed') }}: {{ method.fee_amount }}
            </span>
            <span v-else-if="method.fee_type === 'percentage'">
              {{ $t('paymentMethods.feeTypes.percentage') }}: {{ method.fee_amount }}%
            </span>
          </td>
          <td>
            <span
              :class="method.is_active ? 'badge-active' : 'badge-inactive'"
              class="status-badge"
              :data-testid="method.is_active ? 'status-active' : 'status-inactive'"
            >
              {{ method.is_active ? $t('common.active') : $t('common.inactive') }}
            </span>
          </td>
          <td class="actions-cell">
            <router-link
              :to="`/admin/payment-methods/${method.id}/edit`"
              class="btn btn-sm btn-secondary"
              data-testid="edit-payment-method"
            >
              {{ $t('common.edit') }}
            </router-link>

            <button
              v-if="canManage && method.is_active && !method.is_default"
              class="btn btn-sm btn-warning"
              :disabled="actionLoading === method.id"
              @click="handleDeactivate(method.id)"
            >
              {{ $t('paymentMethods.deactivate') }}
            </button>
            <button
              v-else-if="canManage && !method.is_active"
              class="btn btn-sm btn-success"
              :disabled="actionLoading === method.id"
              @click="handleActivate(method.id)"
            >
              {{ $t('paymentMethods.activate') }}
            </button>

            <button
              v-if="canManage && !method.is_default && method.is_active"
              class="btn btn-sm btn-info"
              :disabled="actionLoading === method.id"
              @click="handleSetDefault(method.id)"
            >
              {{ $t('paymentMethods.setDefault') }}
            </button>

            <button
              v-if="canManage && !method.is_default"
              class="btn btn-sm btn-danger"
              :disabled="actionLoading === method.id"
              @click="handleDelete(method)"
            >
              {{ $t('common.delete') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div
      v-if="successMessage"
      class="success-message"
    >
      {{ successMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePaymentMethodsStore, type PaymentMethod } from '@/stores/paymentMethods';
import { useAuthStore } from '@/stores/auth';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const store = usePaymentMethodsStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('settings.manage'));

const loading = ref(false);
const error = ref<string | null>(null);
const actionLoading = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const selectedMethods = ref(new Set<string>());
const processingBulk = ref(false);
const bulkSuccessMessage = ref('');
const bulkErrorMessage = ref('');

const paymentMethods = computed(() => store.paymentMethods);
const sortedMethods = computed(() => store.sortedByPosition);

const allVisibleSelected = computed(() => {
  if (sortedMethods.value.length === 0) return false;
  return sortedMethods.value.every(method => selectedMethods.value.has(method.id));
});

async function loadPaymentMethods(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    await store.fetchPaymentMethods();
  } catch (e) {
    error.value = (e as Error).message || t('paymentMethods.loadError');
  } finally {
    loading.value = false;
  }
}

async function handleActivate(methodId: string): Promise<void> {
  actionLoading.value = methodId;
  try {
    await store.activatePaymentMethod(methodId);
    showSuccess(t('common.success'));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    actionLoading.value = null;
  }
}

async function handleDeactivate(methodId: string): Promise<void> {
  actionLoading.value = methodId;
  try {
    await store.deactivatePaymentMethod(methodId);
    showSuccess(t('common.success'));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    actionLoading.value = null;
  }
}

async function handleSetDefault(methodId: string): Promise<void> {
  actionLoading.value = methodId;
  try {
    await store.setDefaultPaymentMethod(methodId);
    showSuccess(t('common.success'));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    actionLoading.value = null;
  }
}

async function handleDelete(method: PaymentMethod): Promise<void> {
  if (method.is_default) {
    error.value = t('paymentMethods.cannotDeleteDefault');
    return;
  }

  if (!confirm(t('paymentMethods.confirmDelete'))) {
    return;
  }

  actionLoading.value = method.id;
  try {
    await store.deletePaymentMethod(method.id);
    showSuccess(t('paymentMethods.methodDeleted'));
  } catch (e) {
    error.value = (e as Error).message || t('paymentMethods.deleteError');
  } finally {
    actionLoading.value = null;
  }
}

function showSuccess(message: string): void {
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = null;
  }, 3000);
}

function toggleMethod(methodId: string): void {
  if (selectedMethods.value.has(methodId)) {
    selectedMethods.value.delete(methodId);
  } else {
    selectedMethods.value.add(methodId);
  }
}

function toggleSelectAll(): void {
  if (allVisibleSelected.value) {
    sortedMethods.value.forEach(method => selectedMethods.value.delete(method.id));
  } else {
    sortedMethods.value.forEach(method => selectedMethods.value.add(method.id));
  }
}

async function handleBulkActivate(): Promise<void> {
  if (selectedMethods.value.size === 0) return;

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const methodIds = Array.from(selectedMethods.value);
    let successCount = 0;
    let errorCount = 0;

    for (const methodId of methodIds) {
      try {
        await store.activatePaymentMethod(methodId);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedMethods.value.clear();
    bulkSuccessMessage.value = `${successCount} payment method(s) activated${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await loadPaymentMethods();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to activate payment methods';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkDeactivate(): Promise<void> {
  if (selectedMethods.value.size === 0) return;

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const methodIds = Array.from(selectedMethods.value);
    let successCount = 0;
    let errorCount = 0;

    for (const methodId of methodIds) {
      try {
        await store.deactivatePaymentMethod(methodId);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedMethods.value.clear();
    bulkSuccessMessage.value = `${successCount} payment method(s) deactivated${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await loadPaymentMethods();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to deactivate payment methods';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkDelete(): Promise<void> {
  if (selectedMethods.value.size === 0) return;

  if (!confirm(t('paymentMethods.confirmDeleteBulk'))) {
    return;
  }

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const methodIds = Array.from(selectedMethods.value);
    let successCount = 0;
    const failedMethods: { id: string; reason: string }[] = [];

    for (const methodId of methodIds) {
      try {
        await store.deletePaymentMethod(methodId);
        successCount++;
      } catch (err) {
        failedMethods.push({
          id: methodId,
          reason: (err as Error).message || 'Failed to delete'
        });
      }
    }

    selectedMethods.value.clear();

    if (successCount > 0) {
      await loadPaymentMethods();
    }

    if (failedMethods.length > 0) {
      const reasons = failedMethods.map(m => m.reason).join(', ');
      bulkErrorMessage.value = `${successCount} payment method(s) deleted. ${failedMethods.length} could not be deleted: ${reasons}`;
    } else {
      bulkSuccessMessage.value = `${successCount} payment method(s) deleted successfully`;
      setTimeout(() => {
        bulkSuccessMessage.value = '';
      }, 3000);
    }
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to delete payment methods';
  } finally {
    processingBulk.value = false;
  }
}

onMounted(() => {
  loadPaymentMethods();
});
</script>

<style scoped>
.payment-methods-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #2c3e50;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.error-state {
  color: #e74c3c;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.data-table tbody tr:hover {
  background: #f8f9fa;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85em;
}

.badge-active {
  background: #d4edda;
  color: #155724;
}

.badge-inactive {
  background: #f8d7da;
  color: #721c24;
}

.badge-default {
  background: #cce5ff;
  color: #004085;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75em;
  margin-left: 8px;
}

.actions-cell {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover {
  background: #e0a800;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

code {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

.success-message {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #28a745;
  color: white;
  padding: 12px 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.bulk-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 15px;
  margin-bottom: 20px;
  background: #f0f4f8;
  border-left: 4px solid #3498db;
  border-radius: 4px;
}

.selection-info {
  flex: 1;
  font-weight: 500;
  color: #2c3e50;
}

.bulk-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.2s, background-color 0.2s;
}

.bulk-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.bulk-btn.activate {
  background: #d4edda;
  color: #155724;
}

.bulk-btn.activate:hover:not(:disabled) {
  background: #c3e6cb;
}

.bulk-btn.deactivate {
  background: #fff3cd;
  color: #856404;
}

.bulk-btn.deactivate:hover:not(:disabled) {
  background: #ffeaa7;
}

.bulk-btn.delete {
  background: #f8d7da;
  color: #721c24;
}

.bulk-btn.delete:hover:not(:disabled) {
  background: #f5c6cb;
}

.checkbox-col {
  width: 40px;
  text-align: center;
  padding: 0;
}

.data-table th.checkbox-col {
  padding: 12px;
}

.data-table td.checkbox-col {
  padding: 12px;
}

.checkbox-col input[type="checkbox"] {
  cursor: pointer;
}

.data-table tbody tr.selected {
  background-color: #e3f2fd;
}

.bulk-message {
  padding: 12px 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-weight: 500;
}

.bulk-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.bulk-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>
