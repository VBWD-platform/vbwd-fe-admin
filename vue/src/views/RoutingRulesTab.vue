<template>
  <div class="plans-view">
    <div class="plans-header">
      <h2>CMS Routing Rules</h2>
      <div
        v-if="canManage"
        class="plans-subheader"
        style="margin-bottom: 0;"
      >
        <ImportExportControls
          v-if="showImportExport"
          :api="dataExchangeApi"
          entity-key="cms_routing_rules"
          :selected-ids="selectedRuleIds"
          :can-export="rulesCapabilities.can_export"
          :can-import="rulesCapabilities.can_import"
          :can-export-pii="rulesCapabilities.can_export_pii"
          :is-superadmin="isSuperAdmin"
          :supported-formats="rulesCapabilities.supported_formats"
          @refresh="handleImportRefresh"
        />
        <button
          class="action-btn archive"
          :disabled="reloading"
          data-testid="reload-nginx-btn"
          @click="handleReload"
        >
          {{ reloading ? 'Reloading…' : 'Apply & Reload Nginx' }}
        </button>
        <button
          class="create-btn"
          data-testid="add-rule-btn"
          @click="showForm()"
        >
          + Add Rule
        </button>
      </div>
    </div>

    <p
      v-if="reloadMsg"
      :class="reloadError ? 'toast toast--error' : 'toast toast--ok'"
      data-testid="reload-toast"
    >
      {{ reloadMsg }}
    </p>

    <!-- Layer filter -->
    <div class="plans-filters">
      <label class="checkbox-label">Filter:</label>
      <select
        v-model="layerFilter"
        class="search-input"
        style="max-width: 180px;"
        data-testid="layer-filter"
      >
        <option value="">
          All layers
        </option>
        <option value="middleware">
          Middleware
        </option>
        <option value="nginx">
          Nginx
        </option>
      </select>
    </div>

    <!-- Bulk actions — independent of the table chain below, so selecting a
         checkbox shows this bar ABOVE the table and never hides the table. -->
    <div
      v-if="canManage && !store.loading && selectedIds.size > 0"
      class="bulk-actions"
    >
      <span>{{ selectedIds.size }} selected</span>
      <button
        class="action-btn delete"
        data-testid="bulk-delete-btn"
        @click="handleBulkDelete"
      >
        Delete Selected
      </button>
    </div>

    <div
      v-if="store.loading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>Loading…</p>
    </div>
    <div
      v-else-if="store.error"
      class="error-state"
    >
      {{ store.error }}
    </div>

    <div
      v-else
      class="plans-table-wrap"
    >
      <table class="plans-table">
        <thead>
          <tr>
            <th
              v-if="canManage"
              class="col-check"
            >
              <input
                type="checkbox"
                data-testid="rule-check-all"
                :checked="allSelected"
                :indeterminate="someSelected && !allSelected"
                @change="toggleAll"
              >
            </th>
            <th>Priority</th>
            <th>Name</th>
            <th>Match</th>
            <th>Value</th>
            <th>Target</th>
            <th>Code</th>
            <th>Layer</th>
            <th>Active</th>
            <th v-if="canManage">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="rule in filteredRules"
            :key="rule.id"
            class="plan-row"
            :data-testid="`rule-row-${rule.id}`"
          >
            <td
              v-if="canManage"
              class="col-check"
              @click.stop
            >
              <input
                type="checkbox"
                :data-testid="`rule-check-${rule.id}`"
                :checked="selectedIds.has(rule.id)"
                @change="toggleSelected(rule.id)"
              >
            </td>
            <td>{{ rule.priority }}</td>
            <td>{{ rule.name }}</td>
            <td><span class="category-slug">{{ rule.match_type }}</span></td>
            <td class="rr-value">
              {{ rule.match_value || '—' }}
            </td>
            <td>{{ rule.target_slug }}</td>
            <td>{{ rule.redirect_code }}</td>
            <td>
              <span
                class="status-badge"
                :class="rule.layer === 'nginx' ? 'layer-nginx' : 'layer-middleware'"
              >{{ rule.layer }}</span>
            </td>
            <td>
              <span
                class="status-badge"
                :class="rule.is_active ? 'active' : 'inactive'"
                :style="canManage ? 'cursor: pointer;' : ''"
                :data-testid="`toggle-active-${rule.id}`"
                @click="canManage && toggleActive(rule)"
              >{{ rule.is_active ? 'Active' : 'Inactive' }}</span>
            </td>
            <td
              v-if="canManage"
              class="rr-actions-cell"
              @click.stop
            >
              <button
                class="action-btn archive"
                :data-testid="`edit-btn-${rule.id}`"
                @click="showForm(rule)"
              >
                Edit
              </button>
              <button
                class="action-btn delete"
                :data-testid="`delete-btn-${rule.id}`"
                @click="handleDelete(rule.id)"
              >
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="filteredRules.length === 0">
            <td
              :colspan="canManage ? 10 : 8"
              class="empty-state"
            >
              No routing rules yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <RoutingRuleForm
      v-if="formVisible"
      :rule="editingRule"
      @saved="handleSaved"
      @cancel="formVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ImportExportControls } from 'vbwd-view-component';
import { useAuthStore } from '@/stores/auth';
import { useRoutingRulesStore, type RoutingRule } from '@/stores/routingRules';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';
import RoutingRuleForm from './RoutingRuleForm.vue';

const authStore = useAuthStore();
const store = useRoutingRulesStore();
const canManage = computed(() => authStore.hasPermission('cms.configure'));
const isSuperAdmin = computed(() => authStore.isSuperAdmin);
const formVisible = ref(false);
const editingRule = ref<RoutingRule | undefined>(undefined);
const layerFilter = ref('');
const reloading = ref(false);
const reloadMsg = ref('');
const reloadError = ref(false);

const filteredRules = computed(() =>
  layerFilter.value ? store.rules.filter((r) => r.layer === layerFilter.value) : store.rules,
);

// Bulk selection (over the currently filtered rules).
const selectedIds = reactive(new Set<string>());
const allSelected = computed(
  () => filteredRules.value.length > 0 && filteredRules.value.every((r) => selectedIds.has(r.id)),
);
const someSelected = computed(() => filteredRules.value.some((r) => selectedIds.has(r.id)));

// Clearing on filter change keeps selection consistent with what is visible.
watch(layerFilter, () => selectedIds.clear());

function toggleSelected(id: string) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
}

function toggleAll() {
  if (allSelected.value) {
    filteredRules.value.forEach((r) => selectedIds.delete(r.id));
  } else {
    filteredRules.value.forEach((r) => selectedIds.add(r.id));
  }
}

async function handleBulkDelete() {
  const count = selectedIds.size;
  if (!confirm(`Delete ${count} selected routing rule(s)?`)) return;
  await store.bulkDelete([...selectedIds]);
  selectedIds.clear();
}

// Import/Export controls — generic data-exchange seam, entity ``cms_routing_rules``.
const dataExchangeApi = createDataExchangeApi();
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const rulesCapabilities = computed(() => capabilitiesFor('cms_routing_rules'));
const showImportExport = computed(
  () => rulesCapabilities.value.can_export || rulesCapabilities.value.can_import,
);
const selectedRuleIds = computed(() => [...selectedIds]);

async function handleImportRefresh() {
  await store.fetchRules();
  // Import does not auto-sync nginx — remind the operator to reload.
  reloadError.value = false;
  reloadMsg.value = 'Imported. Click "Apply & Reload Nginx" to publish nginx-layer rules.';
  setTimeout(() => { reloadMsg.value = ''; }, 6000);
}

function showForm(rule?: RoutingRule) {
  editingRule.value = rule;
  formVisible.value = true;
}

async function handleSaved(payload: RoutingRule) {
  try {
    if (payload.id) {
      await store.updateRule(payload.id, payload);
    } else {
      await store.createRule(payload);
    }
    formVisible.value = false;
  } catch {
    // error handled inside form
  }
}

async function handleDelete(id: string) {
  if (!confirm('Delete this routing rule?')) return;
  await store.deleteRule(id);
}

async function toggleActive(rule: RoutingRule) {
  await store.updateRule(rule.id, { is_active: !rule.is_active });
}

async function handleReload() {
  reloading.value = true;
  reloadMsg.value = '';
  reloadError.value = false;
  try {
    await store.reloadNginx();
    reloadMsg.value = 'Nginx reloaded successfully.';
  } catch (err) {
    reloadError.value = true;
    reloadMsg.value = err instanceof Error ? err.message : 'Reload failed';
  } finally {
    reloading.value = false;
    setTimeout(() => { reloadMsg.value = ''; }, 4000);
  }
}

onMounted(() => {
  store.fetchRules();
  loadManifest();
});
</script>

<style scoped>
.plans-view { background: white; padding: 0; border-radius: 8px; }
.plans-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.plans-header h2 { margin: 0; color: #2c3e50; }
.plans-subheader { display: flex; gap: 10px; align-items: center; }
.plans-filters { display: flex; gap: 15px; align-items: center; margin-bottom: 20px; }

.create-btn { padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; }
.create-btn:hover { background: #1e8449; }

.search-input { padding: 10px 15px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.search-input:focus { outline: none; border-color: #3498db; }

.checkbox-label { display: flex; align-items: center; gap: 8px; color: #666; font-size: 14px; }

.loading-state, .error-state, .empty-state { text-align: center; padding: 40px; color: #666; }
.spinner { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.plans-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.plans-table { width: 100%; border-collapse: collapse; }
.plans-table th, .plans-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
.plans-table th { background: #f8f9fa; font-weight: 600; color: #2c3e50; }

.plan-row { transition: background-color 0.2s; }
.plan-row:hover { background-color: #f8f9fa; }

.status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 500; }
.status-badge.active { background: #d4edda; color: #155724; }
.status-badge.inactive { background: #f8d7da; color: #721c24; }
.status-badge.layer-nginx { background: #fef3c7; color: #92400e; }
.status-badge.layer-middleware { background: #dbeafe; color: #1e40af; }

.category-slug { display: inline-block; padding: 2px 7px; margin: 2px 2px 2px 0; background: #e3f2fd; color: #1565c0; border-radius: 10px; font-size: 0.75rem; font-family: monospace; white-space: nowrap; }

.rr-value { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 12px; }
.rr-actions-cell { white-space: nowrap; }

.action-btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 4px; }
.action-btn.archive { background: #ffc107; color: #212529; }
.action-btn.archive:hover { background: #e0a800; }
.action-btn.delete { background: #f8d7da; color: #721c24; }
.action-btn.delete:hover { background: #f5c6cb; }
.action-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.col-check { width: 40px; text-align: center; }
.bulk-actions { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: #fef3c7; border-radius: 4px; margin-bottom: 12px; font-size: 14px; color: #92400e; }

.toast { padding: 10px 16px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }
.toast--ok { background: #d1fae5; color: #065f46; }
.toast--error { background: #fee2e2; color: #991b1b; }
</style>
