<template>
  <div
    data-testid="llm-connections-content"
    class="llm-connections-tab"
  >
    <div class="tab-toolbar">
      <div>
        <h3>{{ $t('llmConnections.title') }}</h3>
        <p class="section-description">
          {{ $t('llmConnections.description') }}
        </p>
      </div>
      <div class="toolbar-actions">
        <ImportExportControls
          v-if="showImportExport"
          data-testid="llm-connections-import-export"
          :api="dataExchangeApi"
          entity-key="llm_connections"
          :selected-ids="selectedIdList"
          :can-export="connectionsCapabilities.can_export"
          :can-import="connectionsCapabilities.can_import"
          :can-export-pii="connectionsCapabilities.can_export_pii"
          :is-superadmin="isSuperAdmin"
          :supported-formats="connectionsCapabilities.supported_formats"
          @refresh="loadConnections"
        />
        <button
          v-if="canManage"
          class="create-btn"
          data-testid="llm-connection-create-btn"
          @click="openCreateForm"
        >
          {{ $t('llmConnections.createConnection') }}
        </button>
      </div>
    </div>

    <div
      v-if="errorMessage"
      data-testid="llm-connection-error-message"
      class="error-message"
    >
      {{ errorMessage }}
    </div>

    <!-- Create / edit form -->
    <form
      v-if="canManage && showForm"
      class="connection-form"
      data-testid="llm-connection-form"
      @submit.prevent="handleSubmit"
    >
      <div class="form-grid">
        <label class="form-field">
          <span>{{ $t('llmConnections.fields.name') }}</span>
          <input
            v-model="formData.connection_name"
            type="text"
            class="form-input"
            data-testid="llm-connection-new-name"
          >
        </label>
        <label class="form-field">
          <span>{{ $t('llmConnections.fields.slug') }}</span>
          <input
            v-model="formData.slug"
            type="text"
            class="form-input"
            data-testid="llm-connection-new-slug"
          >
        </label>
        <label class="form-field">
          <span>{{ $t('llmConnections.fields.model') }}</span>
          <input
            v-model="formData.model"
            type="text"
            class="form-input"
            data-testid="llm-connection-new-model"
          >
        </label>
        <label class="form-field">
          <span>{{ $t('llmConnections.fields.endpoint') }}</span>
          <input
            v-model="formData.api_endpoint"
            type="text"
            class="form-input"
            data-testid="llm-connection-new-endpoint"
          >
        </label>
        <label class="form-field">
          <span>{{ editingId ? $t('llmConnections.fields.keyEdit') : $t('llmConnections.fields.key') }}</span>
          <input
            v-model="formData.api_key"
            type="password"
            autocomplete="off"
            class="form-input"
            data-testid="llm-connection-new-key"
          >
        </label>
        <label class="form-field form-field--toggle">
          <input
            v-model="formData.is_active"
            type="checkbox"
            data-testid="llm-connection-new-active"
          >
          <span>{{ $t('llmConnections.fields.active') }}</span>
        </label>
      </div>
      <div class="form-actions">
        <button
          type="button"
          class="test-btn"
          data-testid="llm-connection-test"
          :disabled="testing"
          @click="handleTest"
        >
          {{ testing ? 'Testing…' : 'Test Connection' }}
        </button>
        <button
          type="submit"
          class="save-btn"
          data-testid="llm-connection-new-submit"
          @click.prevent="handleSubmit"
        >
          {{ $t('common.save') }}
        </button>
        <button
          type="button"
          class="cancel-btn"
          data-testid="llm-connection-new-cancel"
          @click="closeForm"
        >
          {{ $t('common.cancel') }}
        </button>
      </div>
      <p
        v-if="testResult"
        class="test-result"
        :class="testResult.ok ? 'test-result--ok' : 'test-result--fail'"
        data-testid="llm-connection-test-result"
      >
        {{ testResult.text }}
      </p>
    </form>

    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        class="form-input"
        :placeholder="$t('common.search')"
        data-testid="llm-connection-search"
      >
    </div>

    <!-- Bulk toolbar -->
    <div
      v-if="canManage && selectedIds.size > 0"
      class="bulk-toolbar"
      data-testid="llm-bulk-toolbar"
    >
      <span class="bulk-count">
        {{ $t('llmConnections.bulk.selected', { count: selectedIds.size }) }}
      </span>
      <button
        class="action-btn activate-btn"
        data-testid="llm-bulk-activate-btn"
        @click="handleBulkSetActive(true)"
      >
        {{ $t('llmConnections.bulk.activate') }}
      </button>
      <button
        class="action-btn deactivate-btn"
        data-testid="llm-bulk-deactivate-btn"
        @click="handleBulkSetActive(false)"
      >
        {{ $t('llmConnections.bulk.deactivate') }}
      </button>
      <button
        class="action-btn delete-btn"
        data-testid="llm-bulk-delete-btn"
        @click="handleBulkDelete"
      >
        {{ $t('llmConnections.bulk.delete') }}
      </button>
    </div>

    <table
      class="data-table"
      data-testid="llm-connections-table"
    >
      <thead>
        <tr>
          <th
            v-if="canManage"
            class="checkbox-col"
          >
            <input
              type="checkbox"
              :checked="allSelected"
              data-testid="llm-select-all"
              @change="toggleSelectAll"
            >
          </th>
          <th
            v-for="column in sortableColumns"
            :key="column.key"
            class="sortable-header"
            :class="{ 'sort-active': sortKey === column.key }"
            :data-testid="`llm-sort-${column.key}`"
            @click="handleSort(column.key)"
          >
            {{ $t(column.label) }}
            <span class="sort-icon">{{ sortIndicator(column.key) }}</span>
          </th>
          <th>{{ $t('common.status') }}</th>
          <th>{{ $t('llmConnections.columns.default') }}</th>
          <th v-if="canManage">
            {{ $t('common.actions') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="connection in sortedConnections"
          :key="connection.id"
          :data-testid="`llm-connection-row-${connection.id}`"
        >
          <td
            v-if="canManage"
            class="checkbox-col"
          >
            <input
              type="checkbox"
              :checked="selectedIds.has(connection.id)"
              :data-testid="`llm-select-${connection.id}`"
              @change="toggleSelect(connection.id)"
            >
          </td>
          <td>{{ connection.connection_name }}</td>
          <td class="endpoint-cell">
            {{ connection.api_endpoint }}
          </td>
          <td
            class="key-cell"
            :data-testid="`llm-connection-key-${connection.id}`"
          >
            {{ connection.api_key }}
          </td>
          <td>{{ formatDate(connection.last_active_at) }}</td>
          <td>
            <span
              class="status-badge"
              :class="{ active: connection.is_active, inactive: !connection.is_active }"
            >
              {{ connection.is_active ? $t('common.active') : $t('common.inactive') }}
            </span>
          </td>
          <td>
            <span
              v-if="connection.is_default"
              class="badge badge--green"
              :data-testid="`llm-connection-default-badge`"
            >
              {{ $t('llmConnections.columns.default') }}
            </span>
          </td>
          <td
            v-if="canManage"
            class="actions-cell"
          >
            <button
              v-if="!connection.is_default"
              class="action-btn make-default-btn"
              :data-testid="`llm-connection-make-default-${connection.id}`"
              @click="handleMakeDefault(connection.id)"
            >
              {{ $t('llmConnections.makeDefault') }}
            </button>
            <button
              class="action-btn edit-btn"
              :data-testid="`llm-connection-edit-${connection.id}`"
              @click="openEditForm(connection)"
            >
              {{ $t('common.edit') }}
            </button>
            <button
              class="action-btn delete-btn"
              :data-testid="`llm-connection-delete-${connection.id}`"
              @click="handleDelete(connection.id)"
            >
              {{ $t('common.delete') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ImportExportControls } from 'vbwd-view-component';
import { useAuthStore } from '@/stores/auth';
import { useLlmConnectionsStore } from '@/stores/llmConnections';
import type { LlmConnection, LlmConnectionPayload } from '@/stores/llmConnections';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';

const PERM_VIEW = 'llm.connections.view';
const PERM_MANAGE = 'llm.connections.manage';
const ENTITY_KEY = 'llm_connections';

interface SortableColumn {
  key: 'connection_name' | 'api_endpoint' | 'api_key' | 'last_active_at';
  label: string;
}

const sortableColumns: SortableColumn[] = [
  { key: 'connection_name', label: 'llmConnections.columns.name' },
  { key: 'api_endpoint', label: 'llmConnections.columns.endpoint' },
  { key: 'api_key', label: 'llmConnections.columns.apiKey' },
  { key: 'last_active_at', label: 'llmConnections.columns.lastActive' },
];

const { t } = useI18n();
const authStore = useAuthStore();
const connectionsStore = useLlmConnectionsStore();

const canManage = computed(() => authStore.hasPermission(PERM_MANAGE));
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

const dataExchangeApi = createDataExchangeApi();
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const connectionsCapabilities = computed(() => capabilitiesFor(ENTITY_KEY));
const showImportExport = computed(
  () => connectionsCapabilities.value.can_export || connectionsCapabilities.value.can_import,
);

const errorMessage = ref<string | null>(null);
const searchQuery = ref('');
const sortKey = ref<SortableColumn['key'] | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');

const connections = computed(() => connectionsStore.connections);

function emptyForm(): LlmConnectionPayload {
  return {
    connection_name: '',
    slug: '',
    model: '',
    api_endpoint: '',
    api_key: '',
    is_active: true,
  };
}

const showForm = ref(false);
const editingId = ref<string | null>(null);
const formData = reactive<LlmConnectionPayload>(emptyForm());
// "Test Connection" state: a live check of the current form's endpoint/model/key.
const testing = ref(false);
const testResult = ref<{ ok: boolean; text: string } | null>(null);

const selectedIds = reactive(new Set<string>());
const selectedIdList = computed(() => Array.from(selectedIds));

const allSelected = computed(
  () =>
    sortedConnections.value.length > 0 &&
    sortedConnections.value.every((connection) => selectedIds.has(connection.id)),
);

const filteredConnections = computed<LlmConnection[]>(() => {
  if (!searchQuery.value) {
    return connections.value;
  }
  const query = searchQuery.value.toLowerCase();
  return connections.value.filter((connection) =>
    [connection.connection_name, connection.slug, connection.model, connection.api_endpoint]
      .map((value) => (value || '').toLowerCase())
      .some((value) => value.includes(query)),
  );
});

const sortedConnections = computed<LlmConnection[]>(() => {
  if (!sortKey.value) {
    return filteredConnections.value;
  }
  const key = sortKey.value;
  const direction = sortDir.value === 'asc' ? 1 : -1;
  return [...filteredConnections.value].sort((first, second) => {
    const firstValue = String(first[key] ?? '');
    const secondValue = String(second[key] ?? '');
    return firstValue.localeCompare(secondValue) * direction;
  });
});

function sortIndicator(key: SortableColumn['key']): string {
  if (sortKey.value !== key) {
    return '⇅';
  }
  return sortDir.value === 'asc' ? '▲' : '▼';
}

function handleSort(key: SortableColumn['key']): void {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
}

function toggleSelect(connectionId: string): void {
  if (selectedIds.has(connectionId)) {
    selectedIds.delete(connectionId);
  } else {
    selectedIds.add(connectionId);
  }
}

function toggleSelectAll(): void {
  if (allSelected.value) {
    selectedIds.clear();
  } else {
    sortedConnections.value.forEach((connection) => selectedIds.add(connection.id));
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

async function loadConnections(): Promise<void> {
  errorMessage.value = null;
  try {
    await connectionsStore.fetchConnections();
  } catch (error) {
    errorMessage.value = (error as Error).message || t('llmConnections.loadError');
  }
}

function openCreateForm(): void {
  editingId.value = null;
  Object.assign(formData, emptyForm());
  errorMessage.value = null;
  testResult.value = null;
  showForm.value = true;
}

function openEditForm(connection: LlmConnection): void {
  editingId.value = connection.id;
  Object.assign(formData, {
    connection_name: connection.connection_name,
    slug: connection.slug,
    model: connection.model,
    api_endpoint: connection.api_endpoint || '',
    // Never prefill the (masked) key — an empty key on update leaves it unchanged.
    api_key: '',
    is_active: connection.is_active,
  });
  errorMessage.value = null;
  testResult.value = null;
  showForm.value = true;
}

function closeForm(): void {
  showForm.value = false;
}

function buildPayload(): LlmConnectionPayload {
  const payload: LlmConnectionPayload = {
    connection_name: formData.connection_name.trim(),
    slug: formData.slug.trim(),
    model: formData.model.trim(),
    api_endpoint: formData.api_endpoint.trim(),
    is_active: formData.is_active,
  };
  const apiKey = (formData.api_key || '').trim();
  if (apiKey) {
    payload.api_key = apiKey;
  }
  return payload;
}

async function handleSubmit(): Promise<void> {
  errorMessage.value = null;
  try {
    if (editingId.value) {
      await connectionsStore.updateConnection(editingId.value, buildPayload());
    } else {
      await connectionsStore.createConnection(buildPayload());
    }
    showForm.value = false;
  } catch (error) {
    errorMessage.value = (error as Error).message || t('llmConnections.saveError');
  }
}

async function handleTest(): Promise<void> {
  testing.value = true;
  testResult.value = null;
  try {
    const result = await connectionsStore.testConnection(buildPayload());
    testResult.value = result.ok
      ? {
          ok: true,
          text: result.sample
            ? `Connection succeeded — "${result.sample}"`
            : 'Connection succeeded',
        }
      : { ok: false, text: `Failed: ${result.error || 'unknown error'}` };
  } catch (error) {
    testResult.value = {
      ok: false,
      text: `Failed: ${(error as Error).message || 'request error'}`,
    };
  } finally {
    testing.value = false;
  }
}

async function handleMakeDefault(connectionId: string): Promise<void> {
  errorMessage.value = null;
  try {
    await connectionsStore.makeDefault(connectionId);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function handleDelete(connectionId: string): Promise<void> {
  if (!confirm(t('llmConnections.deleteConfirm'))) {
    return;
  }
  errorMessage.value = null;
  try {
    await connectionsStore.deleteConnection(connectionId);
    selectedIds.delete(connectionId);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function handleBulkSetActive(active: boolean): Promise<void> {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) {
    return;
  }
  errorMessage.value = null;
  try {
    await connectionsStore.bulkSetActive(ids, active);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function handleBulkDelete(): Promise<void> {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) {
    return;
  }
  if (!confirm(t('llmConnections.bulk.deleteConfirm', { count: ids.length }))) {
    return;
  }
  errorMessage.value = null;
  try {
    await connectionsStore.bulkDelete(ids);
    selectedIds.clear();
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

onMounted(() => {
  if (authStore.hasPermission(PERM_VIEW) || authStore.hasPermission(PERM_MANAGE)) {
    loadConnections();
    loadManifest();
  }
});
</script>

<style scoped>
.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.tab-toolbar h3 {
  margin: 0 0 6px 0;
  color: #2c3e50;
  font-size: 1rem;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.section-description {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.connection-form {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  background: #f8f9fa;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: #495057;
}

.form-field--toggle {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.search-box {
  margin-bottom: 15px;
}

.bulk-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  background: #eef2ff;
  border-radius: 6px;
  margin-bottom: 12px;
}

.bulk-count {
  font-size: 14px;
  font-weight: 600;
  color: #4338ca;
}

.checkbox-col {
  width: 40px;
  text-align: center;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
}

.sortable-header:hover {
  background: #e9ecef;
}

.sort-icon {
  font-size: 0.7rem;
  margin-left: 4px;
  opacity: 0.5;
}

.sort-active .sort-icon {
  opacity: 1;
}

.endpoint-cell,
.key-cell {
  font-family: monospace;
  font-size: 12px;
  color: #6c757d;
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
  background: #e9ecef;
  color: #666;
}

.badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge--green {
  background: #d4edda;
  color: #155724;
}

.actions-cell {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.action-btn.make-default-btn {
  background: #e3f2fd;
  color: #1976d2;
}

.action-btn.edit-btn {
  background: #e3f2fd;
  color: #1976d2;
}

.action-btn.activate-btn {
  background: #e8f5e9;
  color: #388e3c;
}

.action-btn.deactivate-btn {
  background: #fff3e0;
  color: #f57c00;
}

.action-btn.delete-btn {
  background: #ffebee;
  color: #d32f2f;
}

.create-btn {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.create-btn:hover {
  background: #218838;
}

.save-btn {
  padding: 12px 30px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.save-btn:hover {
  background: #218838;
}

.cancel-btn {
  padding: 12px 30px;
  background: #e9ecef;
  color: #495057;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: #dde1e5;
}

.test-btn {
  padding: 12px 24px;
  background: #ffffff;
  color: #0b6b62;
  border: 1px solid #0b6b62;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-right: auto;
}

.test-btn:hover:not(:disabled) {
  background: #e8f4f2;
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.test-result {
  margin: 10px 0 0;
  font-size: 13px;
}

.test-result--ok {
  color: #1c7c43;
}

.test-result--fail {
  color: #c0392b;
}
</style>
