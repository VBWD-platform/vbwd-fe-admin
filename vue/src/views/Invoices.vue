<template>
  <div
    class="invoices-view"
    data-testid="invoices-view"
  >
    <div class="invoices-header">
      <h2>{{ $t('invoices.title') }}</h2>
      <span
        v-if="!loading && !error"
        class="total-count"
      >{{ total }} {{ $t('common.entries') }}</span>
    </div>

    <div class="invoices-filters">
      <input
        v-model="searchQuery"
        type="text"
        data-testid="search-input"
        :placeholder="$t('common.search')"
        class="search-input"
        @input="handleSearch"
      >
      <select
        v-model="statusFilter"
        data-testid="status-filter"
        class="filter-select"
        @change="handleFilterChange"
      >
        <option value="">
          {{ $t('common.all') }} {{ $t('common.status') }}
        </option>
        <option value="PENDING">
          {{ $t('invoices.statuses.pending') }}
        </option>
        <option value="PAID">
          {{ $t('invoices.statuses.paid') }}
        </option>
        <option value="FAILED">
          {{ $t('invoices.statuses.failed') }}
        </option>
        <option value="CANCELLED">
          {{ $t('invoices.statuses.cancelled') }}
        </option>
        <option value="REFUNDED">
          {{ $t('invoices.statuses.refunded') }}
        </option>
      </select>
    </div>

    <!-- Bulk Actions -->
    <div
      v-if="selectedInvoices.size > 0 && canManage"
      class="bulk-actions"
      data-testid="bulk-actions"
    >
      <span class="selection-info">{{ $t('common.selected', { count: selectedInvoices.size }) }}</span>
      <button
        class="bulk-btn mark-paid"
        :disabled="processingBulk"
        data-testid="bulk-mark-paid-btn"
        @click="handleBulkMarkPaid"
      >
        {{ $t('invoices.bulkMarkPaid') }}
      </button>
      <button
        class="bulk-btn void"
        :disabled="processingBulk"
        data-testid="bulk-void-btn"
        @click="handleBulkVoid"
      >
        {{ $t('invoices.bulkVoid') }}
      </button>
      <button
        class="bulk-btn refund"
        :disabled="processingBulk"
        data-testid="bulk-refund-btn"
        @click="handleBulkRefund"
      >
        {{ $t('invoices.bulkRefund') }}
      </button>
      <button
        class="bulk-btn delete"
        :disabled="processingBulk"
        data-testid="bulk-delete-btn"
        @click="handleBulkDelete"
      >
        {{ $t('invoices.bulkDelete') }}
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

    <div
      v-if="loading"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>

    <div
      v-else-if="error"
      data-testid="error-message"
      class="error-state"
    >
      <p>{{ error }}</p>
      <button
        class="retry-btn"
        @click="fetchInvoices"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <div
      v-else-if="invoices.length === 0"
      data-testid="empty-state"
      class="empty-state"
    >
      <p>{{ $t('invoices.noInvoices') }}</p>
    </div>

    <table
      v-else
      data-testid="invoices-table"
      class="invoices-table"
    >
      <thead>
        <tr>
          <th class="checkbox-col">
            <input
              type="checkbox"
              :checked="allVisibleSelected && sortedInvoices.length > 0"
              :indeterminate="selectedInvoices.size > 0 && !allVisibleSelected"
              data-testid="select-all-checkbox"
              @change="toggleSelectAll"
            >
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'invoice_number', 'sort-asc': sortColumn === 'invoice_number' && sortDirection === 'asc', 'sort-desc': sortColumn === 'invoice_number' && sortDirection === 'desc' }"
            data-sortable="invoice_number"
            @click="handleSort('invoice_number')"
          >
            {{ $t('invoices.invoiceNumber') }}
            <span class="sort-indicator">{{ getSortIndicator('invoice_number') }}</span>
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'user_email', 'sort-asc': sortColumn === 'user_email' && sortDirection === 'asc', 'sort-desc': sortColumn === 'user_email' && sortDirection === 'desc' }"
            data-sortable="user_email"
            @click="handleSort('user_email')"
          >
            {{ $t('invoices.user') }}
            <span class="sort-indicator">{{ getSortIndicator('user_email') }}</span>
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'amount', 'sort-asc': sortColumn === 'amount' && sortDirection === 'asc', 'sort-desc': sortColumn === 'amount' && sortDirection === 'desc' }"
            data-sortable="amount"
            @click="handleSort('amount')"
          >
            {{ $t('invoices.amount') }}
            <span class="sort-indicator">{{ getSortIndicator('amount') }}</span>
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'status', 'sort-asc': sortColumn === 'status' && sortDirection === 'asc', 'sort-desc': sortColumn === 'status' && sortDirection === 'desc' }"
            data-sortable="status"
            @click="handleSort('status')"
          >
            {{ $t('invoices.status') }}
            <span class="sort-indicator">{{ getSortIndicator('status') }}</span>
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'created_at', 'sort-asc': sortColumn === 'created_at' && sortDirection === 'asc', 'sort-desc': sortColumn === 'created_at' && sortDirection === 'desc' }"
            data-sortable="created_at"
            @click="handleSort('created_at')"
          >
            {{ $t('invoices.date') }}
            <span class="sort-indicator">{{ getSortIndicator('created_at') }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="invoice in sortedInvoices"
          :key="invoice.id"
          :data-testid="`invoice-row-${invoice.id}`"
          class="invoice-row"
          :class="{ selected: selectedInvoices.has(invoice.id) }"
        >
          <td
            class="checkbox-col"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="selectedInvoices.has(invoice.id)"
              :data-testid="`select-invoice-${invoice.id}`"
              @change="toggleInvoice(invoice.id)"
            >
          </td>
          <td @click="navigateToInvoice(invoice.id)">
            {{ invoice.invoice_number }}
          </td>
          <td>{{ invoice.user_email }}</td>
          <td>{{ formatAmount(invoice.amount, invoice.currency) }}</td>
          <td>
            <span
              :data-testid="`status-${invoice.status.toLowerCase()}`"
              class="status-badge"
              :class="invoice.status.toLowerCase()"
            >
              {{ formatStatus(invoice.status) }}
            </span>
          </td>
          <td>{{ formatDate(invoice.created_at) }}</td>
        </tr>
      </tbody>
    </table>

    <div
      v-if="totalPages > 1"
      data-testid="pagination"
      class="pagination"
    >
      <button
        data-testid="pagination-prev"
        :disabled="page === 1"
        class="pagination-btn"
        @click="changePage(page - 1)"
      >
        {{ $t('common.previous') }}
      </button>
      <span class="pagination-info">{{ $t('common.page') }} {{ page }} {{ $t('common.of') }} {{ totalPages }}</span>
      <button
        data-testid="pagination-next"
        :disabled="page >= totalPages"
        class="pagination-btn"
        @click="changePage(page + 1)"
      >
        {{ $t('common.next') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useInvoicesStore } from '@/stores/invoices';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();

const router = useRouter();
const invoicesStore = useInvoicesStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('invoices.manage'));

const statusFilter = ref('');
const searchQuery = ref('');
const page = ref(1);
const perPage = ref(20);
const selectedInvoices = ref(new Set<string>());
const processingBulk = ref(false);
const bulkSuccessMessage = ref('');
const bulkErrorMessage = ref('');

// Sorting state
type SortColumn = 'invoice_number' | 'user_email' | 'amount' | 'status' | 'created_at' | null;
type SortDirection = 'asc' | 'desc';
const sortColumn = ref<SortColumn>(null);
const sortDirection = ref<SortDirection>('asc');

const invoices = computed(() => invoicesStore.invoices);

// Filtered and sorted invoices for display
const sortedInvoices = computed(() => {
  // First filter by search query
  let filtered = invoices.value;
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = invoices.value.filter(inv =>
      inv.user_email?.toLowerCase().includes(query) ||
      inv.invoice_number?.toLowerCase().includes(query)
    );
  }

  if (!sortColumn.value) return filtered;

  return [...filtered].sort((a, b) => {
    const column = sortColumn.value as SortColumn;
    if (!column) return 0;

    let aVal = a[column];
    let bVal = b[column];

    // Handle null/undefined
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';

    // Numeric comparison for amount
    if (column === 'amount') {
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortDirection.value === 'asc' ? aNum - bNum : bNum - aNum;
    }

    // String comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const comparison = aVal.localeCompare(bVal);
      return sortDirection.value === 'asc' ? comparison : -comparison;
    }

    // Fallback for other types
    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1;
    return 0;
  });
});
const total = computed(() => invoicesStore.total);
const loading = computed(() => invoicesStore.loading);
const error = computed(() => invoicesStore.error);
const totalPages = computed(() => Math.ceil(total.value / perPage.value));

const allVisibleSelected = computed(() => {
  if (sortedInvoices.value.length === 0) return false;
  return sortedInvoices.value.every(invoice => selectedInvoices.value.has(invoice.id));
});

async function fetchInvoices(): Promise<void> {
  try {
    await invoicesStore.fetchInvoices({
      page: page.value,
      per_page: perPage.value,
      status: statusFilter.value
    });
  } catch {
    // Error is already set in the store
  }
}

function handleSearch(): void {
  // Client-side filtering is handled by the computed property
  // This function is here for consistency and future server-side search
}

function handleFilterChange(): void {
  page.value = 1;
  fetchInvoices();
}

function changePage(newPage: number): void {
  page.value = newPage;
  fetchInvoices();
}

function navigateToInvoice(invoiceId: string): void {
  router.push(`/admin/invoices/${invoiceId}`);
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: t('invoices.statuses.pending'),
    paid: t('invoices.statuses.paid'),
    failed: t('invoices.statuses.failed'),
    cancelled: t('invoices.statuses.cancelled'),
    refunded: t('invoices.statuses.refunded')
  };
  return statusMap[status] || status;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}

function formatAmount(amount: number, currency?: string): string {
  const currencyCode = currency || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(amount);
}

function handleSort(column: SortColumn): void {
  if (sortColumn.value === column) {
    // Toggle direction
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    // New column
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
}

function getSortIndicator(column: SortColumn): string {
  if (sortColumn.value !== column) return '';
  return sortDirection.value === 'asc' ? '▲' : '▼';
}

function toggleInvoice(invoiceId: string): void {
  if (selectedInvoices.value.has(invoiceId)) {
    selectedInvoices.value.delete(invoiceId);
  } else {
    selectedInvoices.value.add(invoiceId);
  }
}

function toggleSelectAll(): void {
  if (allVisibleSelected.value) {
    sortedInvoices.value.forEach(invoice => selectedInvoices.value.delete(invoice.id));
  } else {
    sortedInvoices.value.forEach(invoice => selectedInvoices.value.add(invoice.id));
  }
}

async function handleBulkMarkPaid(): Promise<void> {
  if (selectedInvoices.value.size === 0) return;

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const invoiceIds = Array.from(selectedInvoices.value);
    let successCount = 0;
    let errorCount = 0;

    for (const invoiceId of invoiceIds) {
      try {
        await invoicesStore.markInvoicePaid(invoiceId);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedInvoices.value.clear();
    bulkSuccessMessage.value = `${successCount} invoice(s) marked as paid${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await fetchInvoices();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to mark invoices as paid';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkVoid(): Promise<void> {
  if (selectedInvoices.value.size === 0) return;

  if (!confirm(t('invoices.confirmVoid'))) {
    return;
  }

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const invoiceIds = Array.from(selectedInvoices.value);
    let successCount = 0;
    let errorCount = 0;

    for (const invoiceId of invoiceIds) {
      try {
        await invoicesStore.voidInvoice(invoiceId);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedInvoices.value.clear();
    bulkSuccessMessage.value = `${successCount} invoice(s) voided${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await fetchInvoices();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to void invoices';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkRefund(): Promise<void> {
  if (selectedInvoices.value.size === 0) return;

  if (!confirm(t('invoices.confirmRefund'))) {
    return;
  }

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const invoiceIds = Array.from(selectedInvoices.value);
    let successCount = 0;
    let errorCount = 0;

    for (const invoiceId of invoiceIds) {
      try {
        await invoicesStore.refundInvoice(invoiceId);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedInvoices.value.clear();
    bulkSuccessMessage.value = `${successCount} invoice(s) refunded${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await fetchInvoices();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to refund invoices';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkDelete(): Promise<void> {
  if (selectedInvoices.value.size === 0) return;

  if (!confirm(t('invoices.confirmDelete'))) {
    return;
  }

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const invoiceIds = Array.from(selectedInvoices.value);
    let successCount = 0;
    let errorCount = 0;

    for (const invoiceId of invoiceIds) {
      try {
        await invoicesStore.deleteInvoice(invoiceId);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedInvoices.value.clear();
    bulkSuccessMessage.value = `${successCount} invoice(s) deleted${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    await fetchInvoices();
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to delete invoices';
  } finally {
    processingBulk.value = false;
  }
}

onMounted(() => {
  fetchInvoices();
});
</script>

<style scoped>
.invoices-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.invoices-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.invoices-header h2 {
  margin: 0;
  color: #2c3e50;
}

.total-count {
  color: #666;
  font-size: 0.9rem;
}

.invoices-filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  max-width: 300px;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

.filter-select {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 150px;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-btn:hover {
  background: #2980b9;
}

.invoices-table {
  width: 100%;
  border-collapse: collapse;
}

.invoices-table th,
.invoices-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.invoices-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.invoice-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.invoice-row:hover {
  background-color: #f8f9fa;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.paid {
  background: #d4edda;
  color: #155724;
}

.status-badge.pending {
  background: #cce5ff;
  color: #004085;
}

.status-badge.failed {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.cancelled {
  background: #e9ecef;
  color: #495057;
}

.status-badge.refunded {
  background: #fff3cd;
  color: #856404;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.pagination-btn {
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.pagination-btn:hover:not(:disabled) {
  background: #2980b9;
}

.pagination-info {
  color: #666;
  font-size: 0.9rem;
}

/* Sortable columns */
.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.sortable:hover {
  background-color: #e9ecef;
}

.sortable.sorted {
  background-color: #e3f2fd;
}

.sort-indicator {
  margin-left: 5px;
  font-size: 0.8em;
  color: #3498db;
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

.bulk-btn.mark-paid {
  background: #d4edda;
  color: #155724;
}

.bulk-btn.mark-paid:hover:not(:disabled) {
  background: #c3e6cb;
}

.bulk-btn.void {
  background: #fff3cd;
  color: #856404;
}

.bulk-btn.void:hover:not(:disabled) {
  background: #ffeaa7;
}

.bulk-btn.refund {
  background: #cce5ff;
  color: #004085;
}

.bulk-btn.refund:hover:not(:disabled) {
  background: #b8daff;
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

.invoices-table th.checkbox-col {
  padding: 12px 15px;
}

.invoices-table td.checkbox-col {
  padding: 12px 15px;
}

.checkbox-col input[type="checkbox"] {
  cursor: pointer;
}

.invoice-row.selected {
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
