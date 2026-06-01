<template>
  <div class="access-levels">
    <div class="page-header">
      <h1>{{ $t('access.title') }}</h1>
      <div class="page-header__actions">
        <button
          v-if="canManage"
          class="btn"
          @click="handleExport"
        >
          {{ $t('access.export') }}
        </button>
        <button
          v-if="canManage"
          class="btn"
          @click="importInput?.click()"
        >
          {{ $t('access.import') }}
        </button>
        <input
          ref="importInput"
          type="file"
          accept=".json"
          style="display:none"
          @change="handleImport"
        >
        <router-link
          v-if="canManage"
          :to="activeTab === 'admin' ? '/admin/settings/access/new' : '/admin/settings/access/new?type=user'"
          class="btn btn--primary"
        >
          + {{ activeTab === 'admin' ? $t('access.newLevel') : 'New User Access Level' }}
        </router-link>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        class="tabs__tab"
        :class="{ 'tabs__tab--active': activeTab === 'admin' }"
        @click="activeTab = 'admin'"
      >
        Admin Access Levels
      </button>
      <button
        class="tabs__tab"
        :class="{ 'tabs__tab--active': activeTab === 'user' }"
        @click="activeTab = 'user'"
      >
        User Access Levels
      </button>
      <!-- Plugin-contributed tabs -->
      <button
        v-for="tab in pluginTabs"
        :key="tab.id"
        class="tabs__tab"
        :class="{ 'tabs__tab--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      {{ $t('common.loading') }}
    </div>

    <!-- Bulk actions — independent of the table chain below, so selecting a
         checkbox shows this bar ABOVE the table and never hides the table. -->
    <div
      v-if="!loading && selectedIds.size > 0"
      class="bulk-actions"
    >
      <span>{{ selectedIds.size }} selected</span>
      <button
        class="btn btn--sm btn--danger"
        @click="handleBulkDelete"
      >
        Delete Selected
      </button>
    </div>

    <!-- Admin Access Levels Table -->
    <table
      v-if="!loading && activeTab === 'admin' && adminLevels.length > 0"
      class="data-table"
    >
      <thead>
        <tr>
          <th class="col-check">
            <input
              type="checkbox"
              :checked="allAdminSelected"
              :indeterminate="someAdminSelected && !allAdminSelected"
              @change="toggleAllAdmin"
            >
          </th>
          <th>{{ $t('access.name') }}</th>
          <th>{{ $t('access.slug') }}</th>
          <th>{{ $t('access.permissions') }}</th>
          <th>{{ $t('access.system') }}</th>
          <th>{{ $t('access.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="level in adminLevels"
          :key="level.id"
        >
          <td class="col-check">
            <input
              v-if="!level.is_system"
              type="checkbox"
              :checked="selectedIds.has(level.id)"
              @change="toggleSelected(level.id)"
            >
          </td>
          <td>
            <router-link
              :to="`/admin/settings/access/${level.id}`"
              class="link"
            >
              {{ level.name }}
            </router-link>
          </td>
          <td class="mono">
            {{ level.slug }}
          </td>
          <td>{{ level.permissions.length }} {{ $t('access.permissions') }}</td>
          <td>
            <span
              v-if="level.is_system"
              class="badge badge--blue"
            >{{ $t('access.system') }}</span>
          </td>
          <td>
            <button
              v-if="canDelete(level)"
              class="btn btn--sm btn--danger"
              @click="handleDeleteAdmin(level.id, level.name)"
            >
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- User Access Levels Table -->
    <table
      v-else-if="activeTab === 'user' && userLevels.length > 0"
      class="data-table"
    >
      <thead>
        <tr>
          <th class="col-check">
            <input
              type="checkbox"
              :checked="allUserSelected"
              :indeterminate="someUserSelected && !allUserSelected"
              @change="toggleAllUser"
            >
          </th>
          <th>{{ $t('access.name') }}</th>
          <th>{{ $t('access.slug') }}</th>
          <th>{{ $t('access.permissions') }}</th>
          <th>{{ $t('access.system') }}</th>
          <!-- Plugin-contributed columns -->
          <th
            v-for="col in pluginUserColumns"
            :key="col.id"
          >
            {{ col.header }}
          </th>
          <th>{{ $t('access.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="level in userLevels"
          :key="level.id"
        >
          <td class="col-check">
            <input
              v-if="!level.is_system"
              type="checkbox"
              :checked="selectedIds.has(level.id)"
              @change="toggleSelected(level.id)"
            >
          </td>
          <td>
            <router-link
              :to="`/admin/settings/access/${level.id}?type=user`"
              class="link"
            >
              {{ level.name }}
            </router-link>
          </td>
          <td class="mono">
            {{ level.slug }}
          </td>
          <td>{{ level.permissions.length }} {{ $t('access.permissions') }}</td>
          <td>
            <span
              v-if="level.is_system"
              class="badge badge--blue"
            >{{ $t('access.system') }}</span>
          </td>
          <!-- Plugin-contributed cells (aligned with plugin column headers) -->
          <td
            v-for="col in pluginUserColumns"
            :key="col.id"
          >
            <component
              :is="col.component"
              :level="level"
            />
          </td>
          <td>
            <button
              v-if="canDelete(level)"
              class="btn btn--sm btn--danger"
              @click="handleDeleteUser(level.id, level.name)"
            >
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Plugin tab content -->
    <template v-else-if="activePluginTab">
      <component
        :is="activePluginTab.component"
      />
    </template>

    <p
      v-else-if="!loading"
      class="empty"
    >
      {{ activeTab === 'admin' ? $t('access.noLevels') : 'No user access levels defined.' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { api } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';

interface AccessLevel {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  permissions: string[];
}

const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('settings.system'));
// Super admins may delete system roles / levels; ordinary admins may not.
const isSuperAdmin = computed(() => authStore.isSuperAdmin);
const canDelete = (level: AccessLevel): boolean =>
  canManage.value && (!level.is_system || isSuperAdmin.value);

const importInput = ref<HTMLInputElement | null>(null);
const loading = ref(true);
const activeTab = ref<string>('admin');
const adminLevels = ref<AccessLevel[]>([]);
const userLevels = ref<AccessLevel[]>([]);

// Plugin-contributed tabs
const pluginTabs = computed(() => extensionRegistry.getAccessLevelTabs());
const pluginUserColumns = computed(() => extensionRegistry.getAccessLevelUserColumns());
const activePluginTab = computed(() =>
  pluginTabs.value.find((tab) => tab.id === activeTab.value)
);

// Bulk selection
const selectedIds = reactive(new Set<string>());

const deletableAdminIds = computed(() => adminLevels.value.filter(l => canDelete(l)).map(l => l.id));
const deletableUserIds = computed(() => userLevels.value.filter(l => canDelete(l)).map(l => l.id));

const allAdminSelected = computed(() => deletableAdminIds.value.length > 0 && deletableAdminIds.value.every(id => selectedIds.has(id)));
const someAdminSelected = computed(() => deletableAdminIds.value.some(id => selectedIds.has(id)));
const allUserSelected = computed(() => deletableUserIds.value.length > 0 && deletableUserIds.value.every(id => selectedIds.has(id)));
const someUserSelected = computed(() => deletableUserIds.value.some(id => selectedIds.has(id)));

watch(activeTab, () => selectedIds.clear());

function toggleSelected(id: string) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
}

function toggleAllAdmin() {
  if (allAdminSelected.value) {
    deletableAdminIds.value.forEach(id => selectedIds.delete(id));
  } else {
    deletableAdminIds.value.forEach(id => selectedIds.add(id));
  }
}

function toggleAllUser() {
  if (allUserSelected.value) {
    deletableUserIds.value.forEach(id => selectedIds.delete(id));
  } else {
    deletableUserIds.value.forEach(id => selectedIds.add(id));
  }
}

async function handleBulkDelete() {
  const count = selectedIds.size;
  if (!confirm(`Delete ${count} selected access level(s)?`)) return;
  const endpoint = activeTab.value === 'admin' ? '/admin/access/levels' : '/admin/access/user-levels';
  await Promise.all([...selectedIds].map(id => api.delete(`${endpoint}/${id}`)));
  selectedIds.clear();
  await loadAll();
}

async function loadAdminLevels() {
  try {
    const res = await api.get('/admin/access/levels') as { levels: AccessLevel[] };
    adminLevels.value = res.levels;
  } catch {
    adminLevels.value = [];
  }
}

async function loadUserLevels() {
  try {
    const res = await api.get('/admin/access/user-levels') as { levels: AccessLevel[] };
    userLevels.value = res.levels;
  } catch {
    userLevels.value = [];
  }
}

async function loadAll() {
  loading.value = true;
  try {
    await Promise.all([loadAdminLevels(), loadUserLevels()]);
  } finally {
    loading.value = false;
  }
}

async function handleDeleteAdmin(id: string, name: string) {
  if (!confirm(`Delete access level "${name}"?`)) return;
  await api.delete(`/admin/access/levels/${id}`);
  await loadAdminLevels();
}

async function handleDeleteUser(id: string, name: string) {
  if (!confirm(`Delete user access level "${name}"?`)) return;
  await api.delete(`/admin/access/user-levels/${id}`);
  await loadUserLevels();
}

async function handleExport() {
  const endpoint = activeTab.value === 'admin'
    ? '/admin/access/export'
    : '/admin/access/user-levels/export';
  const res = await api.post(endpoint, {}) as Record<string, unknown>;
  const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = activeTab.value === 'admin' ? 'access-levels.json' : 'user-access-levels.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const endpoint = activeTab.value === 'admin'
      ? '/admin/access/import'
      : '/admin/access/user-levels/import';
    await api.post(endpoint, payload);
    await loadAll();
  } catch (err) {
    alert((err as Error)?.message ?? 'Import failed');
  } finally {
    (e.target as HTMLInputElement).value = '';
  }
}

onMounted(loadAll);
</script>

<style scoped>
.access-levels { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header__actions { display: flex; gap: 8px; align-items: center; }
.tabs { display: flex; gap: 0; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
.tabs__tab {
  padding: 10px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
}
.tabs__tab:hover { color: #374151; }
.tabs__tab--active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  font-weight: 600;
}
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.mono { font-family: monospace; font-size: 0.85rem; color: #6b7280; }
.text-muted { color: #9ca3af; }
.link { color: #3b82f6; text-decoration: none; font-weight: 600; }
.link:hover { text-decoration: underline; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
.badge--green { background: #d4edda; color: #155724; }
.badge--gray { background: #e9ecef; color: #6c757d; }
.badge--blue { background: #cce5ff; color: #004085; }
.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; background: white; }
.btn--primary { background: #3b82f6; color: white; border-color: #3b82f6; text-decoration: none; }
.btn--sm { padding: 4px 8px; font-size: 12px; }
.btn--danger { background: #ef4444; color: white; border-color: #ef4444; }
.col-check { width: 40px; text-align: center; }
.bulk-actions { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: #fef3c7; border-radius: 4px; margin-bottom: 12px; font-size: 14px; color: #92400e; }
.loading, .empty { padding: 40px; text-align: center; color: #6b7280; }
</style>
