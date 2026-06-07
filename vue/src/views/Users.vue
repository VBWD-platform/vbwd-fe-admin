<template>
  <div
    class="users-view"
    data-testid="users-view"
  >
    <div class="users-header">
      <div class="header-left">
        <h2>{{ $t('users.title') }}</h2>
        <span
          v-if="!loading && !error"
          class="total-count"
        >{{ total }} {{ $t('common.entries') }}</span>
      </div>
      <button
        v-if="canManage"
        data-testid="create-user-button"
        class="create-btn"
        @click="navigateToCreate"
      >
        {{ $t('users.createUser') }}
      </button>
    </div>

    <div class="users-filters">
      <input
        v-model="searchQuery"
        type="text"
        data-testid="search-input"
        :placeholder="$t('common.search')"
        class="search-input"
        @keyup.enter="handleSearch"
      >
      <select
        v-model="statusFilter"
        data-testid="status-filter"
        class="status-filter"
        @change="handleStatusChange"
      >
        <option value="">
          {{ $t('common.all') }} {{ $t('common.status') }}
        </option>
        <option value="active">
          {{ $t('common.active') }}
        </option>
        <option value="inactive">
          {{ $t('common.inactive') }}
        </option>
      </select>

      <ImportExportControls
        v-if="showImportExport"
        :api="dataExchangeApi"
        entity-key="users"
        :selected-ids="selectedUserIds"
        :filter-state="userFilterState"
        :can-export="usersCapabilities.can_export"
        :can-import="usersCapabilities.can_import"
        :can-export-pii="usersCapabilities.can_export_pii"
        :is-superadmin="isSuperadmin"
        :supported-formats="usersCapabilities.supported_formats"
        @refresh="fetchUsers"
      />
    </div>

    <!-- Bulk Actions -->
    <div
      v-if="selectedUsers.size > 0 && canManage"
      class="bulk-actions"
      data-testid="bulk-actions"
    >
      <span class="selection-info">{{ $t('common.selected', { count: selectedUsers.size }) }}</span>
      <button
        class="bulk-btn suspend"
        :disabled="processingBulk"
        data-testid="bulk-suspend-btn"
        @click="handleBulkSuspend"
      >
        {{ $t('users.bulkSuspend') }}
      </button>
      <button
        class="bulk-btn activate"
        :disabled="processingBulk"
        data-testid="bulk-activate-btn"
        @click="handleBulkActivate"
      >
        {{ $t('users.bulkActivate') }}
      </button>
      <button
        class="bulk-btn delete"
        :disabled="processingBulk"
        data-testid="bulk-delete-btn"
        @click="handleBulkDelete"
      >
        {{ $t('users.bulkDelete') }}
      </button>
      <span class="bulk-separator" />
      <select
        v-model="bulkRoleId"
        class="bulk-role-select"
        data-testid="bulk-role-select"
      >
        <option value="">
          — Assign Access Level —
        </option>
        <option
          v-for="role in availableRoles"
          :key="role.id"
          :value="role.id"
        >
          {{ role.name }}
        </option>
      </select>
      <button
        class="bulk-btn assign-role"
        :disabled="processingBulk || !bulkRoleId"
        data-testid="bulk-assign-role-btn"
        @click="handleBulkAssignRole"
      >
        Apply
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
        @click="fetchUsers"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <div
      v-else-if="users.length === 0"
      data-testid="empty-state"
      class="empty-state"
    >
      <p>{{ $t('common.noResults') }}</p>
    </div>

    <table
      v-else
      data-testid="users-table"
      class="users-table"
    >
      <thead>
        <tr>
          <th class="checkbox-col">
            <input
              type="checkbox"
              :checked="allVisibleSelected && sortedUsers.length > 0"
              :indeterminate="selectedUsers.size > 0 && !allVisibleSelected"
              data-testid="select-all-checkbox"
              @change="toggleSelectAll"
            >
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'email', 'sort-asc': sortColumn === 'email' && sortDirection === 'asc', 'sort-desc': sortColumn === 'email' && sortDirection === 'desc' }"
            data-sortable="email"
            @click="handleSort('email')"
          >
            {{ $t('users.email') }}
            <span class="sort-indicator">{{ getSortIndicator('email') }}</span>
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'name', 'sort-asc': sortColumn === 'name' && sortDirection === 'asc', 'sort-desc': sortColumn === 'name' && sortDirection === 'desc' }"
            data-sortable="name"
            @click="handleSort('name')"
          >
            {{ $t('users.name') }}
            <span class="sort-indicator">{{ getSortIndicator('name') }}</span>
          </th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'status', 'sort-asc': sortColumn === 'status' && sortDirection === 'asc', 'sort-desc': sortColumn === 'status' && sortDirection === 'desc' }"
            data-sortable="status"
            @click="handleSort('status')"
          >
            {{ $t('users.status') }}
            <span class="sort-indicator">{{ getSortIndicator('status') }}</span>
          </th>
          <th>{{ $t('users.role') }}</th>
          <th
            class="sortable"
            :class="{ sorted: sortColumn === 'created_at', 'sort-asc': sortColumn === 'created_at' && sortDirection === 'asc', 'sort-desc': sortColumn === 'created_at' && sortDirection === 'desc' }"
            data-sortable="created_at"
            @click="handleSort('created_at')"
          >
            {{ $t('users.createdAt') }}
            <span class="sort-indicator">{{ getSortIndicator('created_at') }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="user in sortedUsers"
          :key="user.id"
          :data-testid="`user-row-${user.id}`"
          class="user-row"
          :class="{ selected: selectedUsers.has(user.id) }"
          @click="navigateToEdit(user.id)"
        >
          <td
            class="checkbox-col"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="selectedUsers.has(user.id)"
              :data-testid="`select-user-${user.id}`"
              @change="toggleUser(user.id)"
            >
          </td>
          <td @click="navigateToEdit(user.id)">
            {{ user.email }}
          </td>
          <td>{{ user.name || '-' }}</td>
          <td>
            <span
              v-if="user.is_active"
              data-testid="status-active"
              class="status-badge active"
            >
              {{ $t('users.active') }}
            </span>
            <span
              v-else
              data-testid="status-inactive"
              class="status-badge inactive"
            >
              {{ $t('users.inactive') }}
            </span>
          </td>
          <td>
            <span class="role-badge">{{ user.role }}</span>
          </td>
          <td>{{ formatDate(user.created_at) }}</td>
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
import { ImportExportControls } from 'vbwd-view-component';
import { useUsersStore } from '@/stores/users';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/api';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';

const router = useRouter();
const usersStore = useUsersStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('users.manage'));

// Import/Export controls (S46.4). Capabilities come from the perm-filtered
// data-exchange manifest; the control is hidden (R12) when neither export nor
// import is permitted for the `users` entity.
const dataExchangeApi = createDataExchangeApi();
const isSuperadmin = computed(() => authStore.isSuperAdmin);
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const usersCapabilities = computed(() => capabilitiesFor('users'));
const showImportExport = computed(
  () => usersCapabilities.value.can_export || usersCapabilities.value.can_import,
);
const selectedUserIds = computed(() => [...selectedUsers.value]);
const userFilterState = computed(() => ({
  search: searchQuery.value,
  status: statusFilter.value,
}));

const searchQuery = ref('');
const statusFilter = ref('');
const page = ref(1);
const perPage = ref(20);
const selectedUsers = ref(new Set<string>());
const processingBulk = ref(false);
const bulkSuccessMessage = ref('');
const bulkErrorMessage = ref('');
const bulkRoleId = ref('');

// Access levels for bulk assignment
interface AccessRole {
  id: string;
  name: string;
  slug: string;
}
const availableRoles = ref<AccessRole[]>([]);

// Sorting state
type SortColumn = 'email' | 'name' | 'status' | 'created_at' | null;
type SortDirection = 'asc' | 'desc';

const sortColumn = ref<SortColumn>(null);
const sortDirection = ref<SortDirection>('asc');

const users = computed(() => usersStore.users);
const total = computed(() => usersStore.total);
const loading = computed(() => usersStore.loading);
const error = computed(() => usersStore.error);
const totalPages = computed(() => Math.ceil(total.value / perPage.value));

// Sorted users computed property
const sortedUsers = computed(() => {
  if (!sortColumn.value) return users.value;

  return [...users.value].sort((a, b) => {
    let aVal: string | boolean | undefined;
    let bVal: string | boolean | undefined;

    switch (sortColumn.value) {
      case 'email':
        aVal = a.email?.toLowerCase() || '';
        bVal = b.email?.toLowerCase() || '';
        break;
      case 'name':
        aVal = a.name?.toLowerCase() || '';
        bVal = b.name?.toLowerCase() || '';
        break;
      case 'status':
        aVal = a.is_active;
        bVal = b.is_active;
        break;
      case 'created_at':
        aVal = a.created_at || '';
        bVal = b.created_at || '';
        break;
      default:
        return 0;
    }

    let comparison = 0;
    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      comparison = aVal === bVal ? 0 : aVal ? -1 : 1;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});

const allVisibleSelected = computed(() => {
  if (sortedUsers.value.length === 0) return false;
  return sortedUsers.value.every(user => selectedUsers.value.has(user.id));
});

async function fetchUsers(): Promise<void> {
  try {
    await usersStore.fetchUsers({
      page: page.value,
      per_page: perPage.value,
      search: searchQuery.value,
      status: statusFilter.value
    });
  } catch {
    // Error is already set in the store
  }
}

function handleSearch(): void {
  page.value = 1;
  fetchUsers();
}

function handleStatusChange(): void {
  page.value = 1;
  fetchUsers();
}

function handleSort(column: SortColumn): void {
  if (sortColumn.value === column) {
    // Toggle direction
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    // New column, default to ascending
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
}

function getSortIndicator(column: SortColumn): string {
  if (sortColumn.value !== column) return '';
  return sortDirection.value === 'asc' ? '▲' : '▼';
}

function changePage(newPage: number): void {
  page.value = newPage;
  fetchUsers();
}

function navigateToEdit(userId: string): void {
  router.push(`/admin/users/${userId}/edit`);
}

function navigateToCreate(): void {
  router.push('/admin/users/create');
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}

function toggleUser(userId: string): void {
  if (selectedUsers.value.has(userId)) {
    selectedUsers.value.delete(userId);
  } else {
    selectedUsers.value.add(userId);
  }
}

function toggleSelectAll(): void {
  if (allVisibleSelected.value) {
    sortedUsers.value.forEach(user => selectedUsers.value.delete(user.id));
  } else {
    sortedUsers.value.forEach(user => selectedUsers.value.add(user.id));
  }
}

async function handleBulkSuspend(): Promise<void> {
  if (selectedUsers.value.size === 0) return;

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const userIds = Array.from(selectedUsers.value);
    let successCount = 0;
    let errorCount = 0;

    for (const userId of userIds) {
      try {
        await usersStore.suspendUser(userId, 'Bulk suspended by admin');
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedUsers.value.clear();
    bulkSuccessMessage.value = `${successCount} user(s) suspended${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to suspend users';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkActivate(): Promise<void> {
  if (selectedUsers.value.size === 0) return;

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const userIds = Array.from(selectedUsers.value);
    let successCount = 0;
    let errorCount = 0;

    for (const userId of userIds) {
      try {
        await usersStore.activateUser(userId);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    selectedUsers.value.clear();
    bulkSuccessMessage.value = `${successCount} user(s) activated${errorCount > 0 ? `, ${errorCount} failed` : ''}`;
    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to activate users';
  } finally {
    processingBulk.value = false;
  }
}

async function handleBulkDelete(): Promise<void> {
  if (selectedUsers.value.size === 0) return;

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const userIds = Array.from(selectedUsers.value);

    // Get deletion info for each user to check for dependencies. Core names no
    // plugin domain — it renders the generic, plugin-contributed dependencies[].
    let userWithDependencies: Array<{ userId: string; summary: string }> = [];

    for (const userId of userIds) {
      try {
        const info = await usersStore.getDeletionInfo(userId);
        if (info.has_cascade_dependencies) {
          userWithDependencies.push({
            userId: info.user_id,
            summary: info.dependencies
              .map(d => `${d.count} ${d.label.toLowerCase()}`)
              .join(', ')
          });
        }
      } catch {
        // If we can't get deletion info, proceed with normal delete
      }
    }

    // If there are users with dependencies, ask for two-step confirmation
    if (userWithDependencies.length > 0) {
      const dependencyInfo = userWithDependencies
        .map(u => `${u.userId}: ${u.summary}`)
        .join('\n');

      const firstConfirm = confirm(
        `WARNING: ${userWithDependencies.length} user(s) have transaction history:\n${dependencyInfo}\n\nAll invoices, subscriptions, and related data will be PERMANENTLY DELETED.\n\nDo you understand this will delete all transaction history?`
      );

      if (!firstConfirm) {
        processingBulk.value = false;
        return;
      }

      // Second confirmation
      const secondConfirm = confirm(
        `This is the FINAL confirmation. Click OK to permanently delete ${userWithDependencies.length} user(s) and ALL their transaction history. This cannot be undone.`
      );

      if (!secondConfirm) {
        processingBulk.value = false;
        return;
      }
    } else {
      // Simple confirmation for users without dependencies
      if (!confirm(`Are you sure you want to delete ${userIds.length} user(s)? This action cannot be undone.`)) {
        processingBulk.value = false;
        return;
      }
    }

    // Perform deletion
    let successCount = 0;
    const failedUsers: { id: string; reason: string }[] = [];

    for (const userId of userIds) {
      try {
        const hasDependencies = userWithDependencies.some(u => u.userId === userId);
        await usersStore.deleteUser(userId, hasDependencies);
        successCount++;
      } catch (err) {
        failedUsers.push({
          id: userId,
          reason: (err as Error).message || 'Failed to delete'
        });
      }
    }

    selectedUsers.value.clear();

    if (successCount > 0) {
      await fetchUsers();
    }

    if (failedUsers.length > 0) {
      const reasons = failedUsers.map(u => u.reason).join(', ');
      bulkErrorMessage.value = `${successCount} user(s) deleted. ${failedUsers.length} could not be deleted: ${reasons}`;
    } else {
      bulkSuccessMessage.value = `${successCount} user(s) deleted successfully`;
      setTimeout(() => {
        bulkSuccessMessage.value = '';
      }, 3000);
    }
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to delete users';
  } finally {
    processingBulk.value = false;
  }
}


async function loadRoles() {
  try {
    const res = await api.get('/admin/access/levels') as { levels: AccessRole[] };
    availableRoles.value = res.levels;
  } catch {
    // Access API may not be available
  }
}

async function handleBulkAssignRole(): Promise<void> {
  if (selectedUsers.value.size === 0 || !bulkRoleId.value) return;

  processingBulk.value = true;
  bulkErrorMessage.value = '';
  bulkSuccessMessage.value = '';

  try {
    const userIds = Array.from(selectedUsers.value);
    for (const userId of userIds) {
      await api.post(`/admin/access/users/${userId}/roles`, { role_id: bulkRoleId.value });
    }

    const roleName = availableRoles.value.find(r => r.id === bulkRoleId.value)?.name || '';
    bulkSuccessMessage.value = `Assigned "${roleName}" to ${userIds.length} user(s)`;
    selectedUsers.value.clear();
    bulkRoleId.value = '';

    setTimeout(() => {
      bulkSuccessMessage.value = '';
    }, 3000);
  } catch (err) {
    bulkErrorMessage.value = (err as Error).message || 'Failed to assign role';
  } finally {
    processingBulk.value = false;
  }
}

onMounted(() => {
  fetchUsers();
  loadRoles();
  loadManifest();
});
</script>

<style scoped>
.users-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.users-header h2 {
  margin: 0;
  color: #2c3e50;
}

.total-count {
  color: #666;
  font-size: 0.9rem;
}

.create-btn {
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.create-btn:hover {
  background: #1e8449;
}

.users-filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.status-filter {
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

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.users-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.users-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.users-table th.sortable:hover {
  background: #e9ecef;
}

.users-table th.sorted {
  background: #e3f2fd;
}

.sort-indicator {
  margin-left: 5px;
  font-size: 0.75rem;
  color: #3498db;
}

.user-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-row:hover {
  background-color: #f8f9fa;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #f8d7da;
  color: #721c24;
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  margin-right: 5px;
  background: #e9ecef;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #495057;
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

.bulk-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 15px;
  margin-bottom: 20px;
  background: #f0f4f8;
  border-left: 4px solid #3498db;
  border-radius: 4px;
  data-testid: bulk-actions;
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

.bulk-btn.suspend {
  background: #fff3cd;
  color: #856404;
}

.bulk-btn.suspend:hover:not(:disabled) {
  background: #ffeaa7;
}

.bulk-btn.activate {
  background: #d4edda;
  color: #155724;
}

.bulk-btn.activate:hover:not(:disabled) {
  background: #c3e6cb;
}

.bulk-btn.delete {
  background: #f8d7da;
  color: #721c24;
}

.bulk-btn.delete:hover:not(:disabled) {
  background: #f5c6cb;
}

.bulk-separator {
  width: 1px;
  height: 24px;
  background: #d1d5db;
  margin: 0 4px;
}

.bulk-role-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  background: white;
}

.bulk-btn.assign-role {
  background: #ede7f6;
  color: #4527a0;
}

.bulk-btn.assign-role:hover:not(:disabled) {
  background: #d1c4e9;
}

.checkbox-col {
  width: 40px;
  text-align: center;
  padding: 0;
}

.users-table th.checkbox-col {
  padding: 12px 15px;
}

.users-table td.checkbox-col {
  padding: 12px 15px;
}

.checkbox-col input[type="checkbox"] {
  cursor: pointer;
}

.user-row.selected {
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
