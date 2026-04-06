<template>
  <div class="perm-matrix">
    <!-- Standard permissions table -->
    <table class="perm-table">
      <thead>
        <tr>
          <th class="col-bulk" />
          <th class="col-resource">
            Resource
          </th>
          <th class="col-action">
            <label class="column-toggle">
              <input
                type="checkbox"
                :checked="isColumnAllSelected('view')"
                :indeterminate="isColumnIndeterminate('view')"
                @change="toggleColumn('view')"
              >
              view
            </label>
          </th>
          <th class="col-action">
            <label class="column-toggle">
              <input
                type="checkbox"
                :checked="isColumnAllSelected('manage')"
                :indeterminate="isColumnIndeterminate('manage')"
                @change="toggleColumn('manage')"
              >
              manage
            </label>
          </th>
          <th class="col-action">
            <label class="column-toggle">
              <input
                type="checkbox"
                :checked="isColumnAllSelected('configure')"
                :indeterminate="isColumnIndeterminate('configure')"
                @change="toggleColumn('configure')"
              >
              configure
            </label>
          </th>
        </tr>
      </thead>
      <tbody>
        <template
          v-for="group in tableData"
          :key="group.name"
        >
          <!-- Group header row -->
          <tr class="group-header">
            <td class="col-bulk">
              <input
                type="checkbox"
                :checked="isGroupSelected(group)"
                :indeterminate="isGroupIndeterminate(group)"
                @change="toggleGroup(group)"
              >
            </td>
            <td
              colspan="4"
              class="group-label"
            >
              {{ group.name }}
            </td>
          </tr>
          <!-- Resource rows -->
          <tr
            v-for="row in group.rows"
            :key="row.resource"
            class="resource-row"
          >
            <td class="col-bulk">
              <input
                type="checkbox"
                :checked="isRowSelected(row)"
                :indeterminate="isRowIndeterminate(row)"
                @change="toggleRow(row)"
              >
            </td>
            <td class="col-resource">
              {{ row.label }}
            </td>
            <td class="col-action">
              <input
                v-if="row.permissions.view"
                type="checkbox"
                :checked="selected.has(row.permissions.view)"
                @change="toggle(row.permissions.view!)"
              >
              <span
                v-else
                class="not-applicable"
              >—</span>
            </td>
            <td class="col-action">
              <input
                v-if="row.permissions.manage"
                type="checkbox"
                :checked="selected.has(row.permissions.manage)"
                @change="toggle(row.permissions.manage!)"
              >
              <span
                v-else
                class="not-applicable"
              >—</span>
            </td>
            <td class="col-action">
              <input
                v-if="row.permissions.configure"
                type="checkbox"
                :checked="selected.has(row.permissions.configure)"
                @change="toggle(row.permissions.configure!)"
              >
              <span
                v-else
                class="not-applicable"
              >—</span>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <!-- Special permissions section -->
    <div
      v-if="specialPermissions.length > 0"
      class="special-section"
    >
      <h3 class="special-title">
        Special Permissions
      </h3>
      <div class="special-grid">
        <label
          v-for="perm in specialPermissions"
          :key="perm.key"
          class="special-item"
          :class="{ checked: selected.has(perm.key) }"
        >
          <input
            type="checkbox"
            :checked="selected.has(perm.key)"
            @change="toggle(perm.key)"
          >
          <span class="special-label">{{ perm.label }}</span>
          <span class="special-key">{{ perm.key }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface PermDef {
  key: string;
  label: string;
  group: string;
}

interface PermissionRow {
  resource: string;
  label: string;
  permissions: {
    view?: string;
    manage?: string;
    configure?: string;
  };
}

interface PermissionGroup {
  name: string;
  rows: PermissionRow[];
}

const props = defineProps<{
  permissions: PermDef[];
  selected: Set<string>;
}>();

const emit = defineEmits<{
  toggle: [key: string];
}>();

function toggle(key: string) {
  emit('toggle', key);
}

// Standard actions that go into the table
const STANDARD_ACTIONS = ['view', 'manage', 'configure'];

// Build table data from flat permissions
const tableData = computed((): PermissionGroup[] => {
  const groups: Record<string, Record<string, { view?: string; manage?: string; configure?: string }>> = {};

  for (const perm of props.permissions) {
    const parts = perm.key.split('.');
    const action = parts[parts.length - 1];

    if (!STANDARD_ACTIONS.includes(action)) continue;

    const group = perm.group || 'Other';
    const resource = parts.length >= 3 ? parts.slice(1, -1).join('.') : parts[0];

    if (!groups[group]) groups[group] = {};
    if (!groups[group][resource]) groups[group][resource] = {};
    (groups[group][resource] as Record<string, string>)[action] = perm.key;
  }

  return Object.entries(groups).map(([name, resources]) => ({
    name,
    rows: Object.entries(resources).map(([resource, permissions]) => ({
      resource,
      label: resource.charAt(0).toUpperCase() + resource.slice(1).replace(/[._-]/g, ' '),
      permissions,
    })),
  }));
});

// Permissions that don't fit view/manage/configure
const specialPermissions = computed((): PermDef[] => {
  return props.permissions.filter(perm => {
    const action = perm.key.split('.').pop();
    return !STANDARD_ACTIONS.includes(action || '');
  });
});

// Group selection helpers
function isGroupSelected(group: PermissionGroup): boolean {
  const keys = getGroupViewManageKeys(group);
  return keys.length > 0 && keys.every(k => props.selected.has(k));
}

function isGroupIndeterminate(group: PermissionGroup): boolean {
  const keys = getGroupViewManageKeys(group);
  const checked = keys.filter(k => props.selected.has(k)).length;
  return checked > 0 && checked < keys.length;
}

function toggleGroup(group: PermissionGroup) {
  const keys = getGroupViewManageKeys(group);
  const allSelected = keys.every(k => props.selected.has(k));
  for (const key of keys) {
    if (allSelected) {
      if (props.selected.has(key)) emit('toggle', key);
    } else {
      if (!props.selected.has(key)) emit('toggle', key);
    }
  }
}

function getGroupViewManageKeys(group: PermissionGroup): string[] {
  const keys: string[] = [];
  for (const row of group.rows) {
    if (row.permissions.view) keys.push(row.permissions.view);
    if (row.permissions.manage) keys.push(row.permissions.manage);
  }
  return keys;
}

// Row selection helpers
function isRowSelected(row: PermissionRow): boolean {
  const keys = getRowViewManageKeys(row);
  return keys.length > 0 && keys.every(k => props.selected.has(k));
}

function isRowIndeterminate(row: PermissionRow): boolean {
  const keys = getRowViewManageKeys(row);
  const checked = keys.filter(k => props.selected.has(k)).length;
  return checked > 0 && checked < keys.length;
}

function toggleRow(row: PermissionRow) {
  const keys = getRowViewManageKeys(row);
  const allSelected = keys.every(k => props.selected.has(k));
  for (const key of keys) {
    if (allSelected) {
      if (props.selected.has(key)) emit('toggle', key);
    } else {
      if (!props.selected.has(key)) emit('toggle', key);
    }
  }
}

function getRowViewManageKeys(row: PermissionRow): string[] {
  const keys: string[] = [];
  if (row.permissions.view) keys.push(row.permissions.view);
  if (row.permissions.manage) keys.push(row.permissions.manage);
  return keys;
}

// Column-level selection helpers
function getAllColumnKeys(action: string): string[] {
  const keys: string[] = [];
  for (const group of tableData.value) {
    for (const row of group.rows) {
      const key = (row.permissions as Record<string, string | undefined>)[action];
      if (key) keys.push(key);
    }
  }
  return keys;
}

function isColumnAllSelected(action: string): boolean {
  const keys = getAllColumnKeys(action);
  return keys.length > 0 && keys.every(k => props.selected.has(k));
}

function isColumnIndeterminate(action: string): boolean {
  const keys = getAllColumnKeys(action);
  const checked = keys.filter(k => props.selected.has(k)).length;
  return checked > 0 && checked < keys.length;
}

function toggleColumn(action: string) {
  const keys = getAllColumnKeys(action);
  const allSelected = keys.every(k => props.selected.has(k));
  for (const key of keys) {
    if (allSelected) {
      if (props.selected.has(key)) emit('toggle', key);
    } else {
      if (!props.selected.has(key)) emit('toggle', key);
    }
  }
}
</script>

<style scoped>
.perm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.perm-table th {
  text-align: left;
  padding: 8px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #e5e7eb;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.col-bulk { width: 40px; text-align: center; }
.col-resource { min-width: 160px; }
.col-action { width: 100px; text-align: center; }

.column-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.group-header td {
  padding: 10px 12px 6px;
  font-weight: 700;
  font-size: 0.8rem;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.group-header .col-bulk { text-align: center; }

.resource-row td {
  padding: 6px 12px;
  border-bottom: 1px solid #f3f4f6;
}

.resource-row:hover td {
  background: #f9fafb;
}

.col-resource {
  font-weight: 500;
  color: #374151;
}

.not-applicable {
  color: #d1d5db;
  font-size: 0.8rem;
}

input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* Special permissions */
.special-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.special-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.special-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 6px;
}

.special-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.special-item:hover { background: #f9fafb; }
.special-item.checked { background: #eff6ff; border-color: #93c5fd; }
.special-label { font-size: 0.875rem; font-weight: 500; color: #374151; flex: 1; }
.special-key { font-size: 0.7rem; font-family: monospace; color: #9ca3af; }
</style>
