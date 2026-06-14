<template>
  <div class="user-groups">
    <div class="page-header">
      <h1>{{ $t('userGroups.title') }}</h1>
      <div class="page-header__actions">
        <ImportExportControls
          v-if="showImportExport"
          :api="dataExchangeApi"
          entity-key="user_groups"
          :selected-ids="selectedGroupIds"
          :can-export="capabilities.can_export"
          :can-import="capabilities.can_import"
          :can-export-pii="capabilities.can_export_pii"
          :is-superadmin="isSuperAdmin"
          :supported-formats="capabilities.supported_formats"
          @refresh="loadGroups"
        />
        <button
          class="btn btn--primary"
          data-testid="new-user-group-btn"
          @click="openCreateForm"
        >
          + {{ $t('userGroups.newGroup') }}
        </button>
      </div>
    </div>

    <div class="toolbar">
      <input
        v-model="search"
        type="text"
        data-testid="user-groups-search"
        class="search-input"
        :placeholder="$t('userGroups.searchPlaceholder')"
      >
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      {{ $t('common.loading') }}
    </div>

    <div
      v-if="!loading && selectedIds.size > 0"
      class="bulk-actions"
    >
      <span>{{ selectedIds.size }} {{ $t('userGroups.selected') }}</span>
      <button
        class="btn btn--sm btn--danger"
        data-testid="bulk-delete-btn"
        @click="handleBulkDelete"
      >
        {{ $t('userGroups.deleteSelected') }}
      </button>
    </div>

    <table
      v-if="!loading && filteredGroups.length > 0"
      class="data-table"
      data-testid="user-groups-table"
    >
      <thead>
        <tr>
          <th class="col-check">
            <input
              type="checkbox"
              :checked="allSelected"
              :indeterminate="someSelected && !allSelected"
              @change="toggleAll"
            >
          </th>
          <th
            class="sortable"
            @click="sortBy('slug')"
          >
            {{ $t('userGroups.slug') }}
          </th>
          <th
            class="sortable"
            @click="sortBy('name')"
          >
            {{ $t('userGroups.name') }}
          </th>
          <th>{{ $t('userGroups.lang') }}</th>
          <th>{{ $t('userGroups.parentGroup') }}</th>
          <th>{{ $t('userGroups.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="group in filteredGroups"
          :key="group.id"
        >
          <td class="col-check">
            <input
              type="checkbox"
              :checked="selectedIds.has(group.id)"
              @change="toggleSelected(group.id)"
            >
          </td>
          <td class="mono">
            {{ group.slug }}
          </td>
          <td>{{ group.name }}</td>
          <td>{{ group.lang || '-' }}</td>
          <td class="mono">
            {{ group.parent_group || '-' }}
          </td>
          <td>
            <button
              class="btn btn--sm"
              @click="openEditForm(group)"
            >
              {{ $t('common.edit') }}
            </button>
            <button
              class="btn btn--sm btn--danger"
              @click="handleDelete(group)"
            >
              {{ $t('common.delete') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-else-if="!loading"
      class="empty"
    >
      {{ $t('userGroups.empty') }}
    </p>

    <!-- Create / edit form -->
    <div
      v-if="showForm"
      class="form-card"
      data-testid="user-group-form"
    >
      <h3>{{ editingId ? $t('userGroups.editGroup') : $t('userGroups.newGroup') }}</h3>
      <div
        v-if="formError"
        class="form-error"
        data-testid="form-error"
      >
        {{ formError }}
      </div>
      <div class="form-group">
        <label>{{ $t('userGroups.slug') }}</label>
        <input
          v-model="formData.slug"
          type="text"
          class="form-input"
          data-testid="form-slug"
        >
      </div>
      <div class="form-group">
        <label>{{ $t('userGroups.name') }}</label>
        <input
          v-model="formData.name"
          type="text"
          class="form-input"
          data-testid="form-name"
        >
      </div>
      <div class="form-group">
        <label>{{ $t('userGroups.lang') }}</label>
        <input
          v-model="formData.lang"
          type="text"
          maxlength="8"
          class="form-input"
          data-testid="form-lang"
        >
      </div>
      <div class="form-group">
        <label>{{ $t('userGroups.parentGroup') }}</label>
        <select
          v-model="formData.parent_group"
          class="form-select"
          data-testid="form-parent"
        >
          <option value="">
            {{ $t('userGroups.noParent') }}
          </option>
          <option
            v-for="option in parentOptions"
            :key="option.slug"
            :value="option.slug"
          >
            {{ option.name }} ({{ option.slug }})
          </option>
        </select>
      </div>
      <div class="form-actions">
        <button
          class="btn"
          @click="closeForm"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          class="btn btn--primary"
          data-testid="form-save"
          @click="saveForm"
        >
          {{ $t('common.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ImportExportControls } from 'vbwd-view-component';
import { api } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';

interface UserGroup {
  id: string;
  slug: string;
  name: string;
  lang: string | null;
  parent_group: string | null;
}

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

const loading = ref(true);
const groups = ref<UserGroup[]>([]);
const search = ref('');
const sortKey = ref<'slug' | 'name'>('slug');
const sortAsc = ref(true);

const selectedIds = reactive(new Set<string>());

const dataExchangeApi = createDataExchangeApi();
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const capabilities = computed(() => capabilitiesFor('user_groups'));
const showImportExport = computed(
  () => capabilities.value.can_export || capabilities.value.can_import,
);
const selectedGroupIds = computed(() => [...selectedIds]);

const filteredGroups = computed(() => {
  const query = search.value.trim().toLowerCase();
  let rows = groups.value;
  if (query) {
    rows = rows.filter(
      (group) =>
        group.slug.toLowerCase().includes(query) ||
        group.name.toLowerCase().includes(query),
    );
  }
  return [...rows].sort((a, b) => {
    const left = (a[sortKey.value] || '').toLowerCase();
    const right = (b[sortKey.value] || '').toLowerCase();
    if (left < right) return sortAsc.value ? -1 : 1;
    if (left > right) return sortAsc.value ? 1 : -1;
    return 0;
  });
});

const allSelected = computed(
  () =>
    filteredGroups.value.length > 0 &&
    filteredGroups.value.every((group) => selectedIds.has(group.id)),
);
const someSelected = computed(() =>
  filteredGroups.value.some((group) => selectedIds.has(group.id)),
);

const parentOptions = computed(() =>
  groups.value.filter((group) => group.slug !== formData.slug),
);

function sortBy(key: 'slug' | 'name') {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = true;
  }
}

function toggleSelected(id: string) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
}

function toggleAll() {
  if (allSelected.value) {
    filteredGroups.value.forEach((group) => selectedIds.delete(group.id));
  } else {
    filteredGroups.value.forEach((group) => selectedIds.add(group.id));
  }
}

async function loadGroups() {
  loading.value = true;
  try {
    const res = (await api.get('/admin/user-groups')) as { groups: UserGroup[] };
    groups.value = res.groups;
  } catch {
    groups.value = [];
  } finally {
    loading.value = false;
  }
}

// ── form state ────────────────────────────────────────────────────────────
const showForm = ref(false);
const editingId = ref<string | null>(null);
const formError = ref<string | null>(null);
const formData = reactive({
  slug: '',
  name: '',
  lang: '',
  parent_group: '',
});

function resetForm() {
  formData.slug = '';
  formData.name = '';
  formData.lang = '';
  formData.parent_group = '';
  formError.value = null;
}

function openCreateForm() {
  editingId.value = null;
  resetForm();
  showForm.value = true;
}

function openEditForm(group: UserGroup) {
  editingId.value = group.id;
  formData.slug = group.slug;
  formData.name = group.name;
  formData.lang = group.lang || '';
  formData.parent_group = group.parent_group || '';
  formError.value = null;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
}

async function saveForm() {
  formError.value = null;
  const payload = {
    slug: formData.slug,
    name: formData.name,
    lang: formData.lang || null,
    parent_group: formData.parent_group || null,
  };
  try {
    if (editingId.value) {
      await api.put(`/admin/user-groups/${editingId.value}`, payload);
    } else {
      await api.post('/admin/user-groups', payload);
    }
    showForm.value = false;
    await loadGroups();
  } catch (error) {
    formError.value = (error as Error).message || 'Save failed';
  }
}

async function handleDelete(group: UserGroup) {
  if (!confirm(`Delete user group "${group.name}"?`)) return;
  await api.delete(`/admin/user-groups/${group.id}`);
  await loadGroups();
}

async function handleBulkDelete() {
  const count = selectedIds.size;
  if (!confirm(`Delete ${count} selected user group(s)?`)) return;
  await api.post('/admin/user-groups/bulk-delete', { ids: [...selectedIds] });
  selectedIds.clear();
  await loadGroups();
}

onMounted(() => {
  loadGroups();
  loadManifest();
});
</script>

<style scoped>
.user-groups { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header__actions { display: flex; gap: 8px; align-items: center; }
.toolbar { margin-bottom: 16px; }
.search-input { width: 100%; max-width: 320px; padding: 10px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.sortable { cursor: pointer; user-select: none; }
.mono { font-family: monospace; font-size: 0.85rem; color: #6b7280; }
.col-check { width: 40px; text-align: center; }
.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; background: white; }
.btn--primary { background: #3b82f6; color: white; border-color: #3b82f6; }
.btn--sm { padding: 4px 8px; font-size: 12px; }
.btn--danger { background: #ef4444; color: white; border-color: #ef4444; }
.bulk-actions { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: #fef3c7; border-radius: 4px; margin-bottom: 12px; font-size: 14px; color: #92400e; }
.loading, .empty { padding: 40px; text-align: center; color: #6b7280; }
.form-card { margin-top: 24px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; max-width: 480px; }
.form-card h3 { margin: 0 0 16px 0; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; }
.form-input, .form-select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.form-error { background: #f8d7da; color: #721c24; padding: 10px 12px; border-radius: 4px; margin-bottom: 14px; font-size: 14px; }
.form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
