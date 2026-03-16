<template>
  <div class="routing-rules">
    <div class="routing-rules__header">
      <h1 class="routing-rules__title">
        CMS Routing Rules
      </h1>
      <div class="routing-rules__actions">
        <button
          class="rr-btn rr-btn--secondary"
          :disabled="reloading"
          data-testid="reload-nginx-btn"
          @click="handleReload"
        >
          {{ reloading ? 'Reloading…' : 'Apply & Reload Nginx' }}
        </button>
        <button
          class="rr-btn rr-btn--primary"
          data-testid="add-rule-btn"
          @click="showForm()"
        >
          + Add Rule
        </button>
      </div>
    </div>

    <p
      v-if="reloadMsg"
      :class="reloadError ? 'rr-toast rr-toast--error' : 'rr-toast rr-toast--ok'"
      data-testid="reload-toast"
    >
      {{ reloadMsg }}
    </p>

    <!-- Layer filter -->
    <div class="routing-rules__filter">
      <label class="rr-filter-label">Filter:</label>
      <select
        v-model="layerFilter"
        class="rr-select"
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

    <div
      v-if="store.loading"
      class="rr-loading"
    >
      Loading…
    </div>
    <div
      v-else-if="store.error"
      class="rr-error"
    >
      {{ store.error }}
    </div>

    <table
      v-else
      class="rr-table"
    >
      <thead>
        <tr>
          <th>Priority</th>
          <th>Name</th>
          <th>Match</th>
          <th>Value</th>
          <th>Target</th>
          <th>Code</th>
          <th>Layer</th>
          <th>Active</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="rule in filteredRules"
          :key="rule.id"
          :class="{ 'rr-row--inactive': !rule.is_active }"
          :data-testid="`rule-row-${rule.id}`"
        >
          <td>{{ rule.priority }}</td>
          <td>{{ rule.name }}</td>
          <td><span class="rr-badge">{{ rule.match_type }}</span></td>
          <td class="rr-value">
            {{ rule.match_value || '—' }}
          </td>
          <td>{{ rule.target_slug }}</td>
          <td>{{ rule.redirect_code }}</td>
          <td><span :class="`rr-layer rr-layer--${rule.layer}`">{{ rule.layer }}</span></td>
          <td>
            <input
              type="checkbox"
              :checked="rule.is_active"
              :data-testid="`toggle-active-${rule.id}`"
              @change="toggleActive(rule)"
            >
          </td>
          <td class="rr-actions-cell">
            <button
              class="rr-btn-sm rr-btn-sm--edit"
              :data-testid="`edit-btn-${rule.id}`"
              @click="showForm(rule)"
            >
              Edit
            </button>
            <button
              class="rr-btn-sm rr-btn-sm--delete"
              :data-testid="`delete-btn-${rule.id}`"
              @click="handleDelete(rule.id)"
            >
              Delete
            </button>
          </td>
        </tr>
        <tr v-if="filteredRules.length === 0">
          <td
            colspan="9"
            class="rr-empty"
          >
            No routing rules yet.
          </td>
        </tr>
      </tbody>
    </table>

    <RoutingRuleForm
      v-if="formVisible"
      :rule="editingRule"
      @saved="handleSaved"
      @cancel="formVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoutingRulesStore, type RoutingRule } from '@/stores/routingRules';
import RoutingRuleForm from './RoutingRuleForm.vue';

const store = useRoutingRulesStore();
const formVisible = ref(false);
const editingRule = ref<RoutingRule | undefined>(undefined);
const layerFilter = ref('');
const reloading = ref(false);
const reloadMsg = ref('');
const reloadError = ref(false);

const filteredRules = computed(() =>
  layerFilter.value ? store.rules.filter((r) => r.layer === layerFilter.value) : store.rules,
);

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

onMounted(() => store.fetchRules());
</script>

<style scoped>
.routing-rules { max-width: 1100px; margin: 0 auto; padding: 28px 20px; }
.routing-rules__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.routing-rules__title { font-size: 1.4rem; color: #2c3e50; margin: 0; }
.routing-rules__actions { display: flex; gap: 10px; }
.routing-rules__filter { margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.rr-filter-label { font-size: 13px; color: #6b7280; }
.rr-select { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
.rr-btn { padding: 8px 18px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; }
.rr-btn:disabled { opacity: .6; cursor: default; }
.rr-btn--primary { background: #3498db; color: #fff; }
.rr-btn--primary:hover:not(:disabled) { background: #2980b9; }
.rr-btn--secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
.rr-btn--secondary:hover:not(:disabled) { background: #e5e7eb; }
.rr-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.rr-table th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #e9ecef; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
.rr-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
.rr-row--inactive td { opacity: .5; }
.rr-badge { background: #f3f4f6; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-family: monospace; }
.rr-value { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 12px; }
.rr-layer { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.rr-layer--nginx { background: #fef3c7; color: #92400e; }
.rr-layer--middleware { background: #dbeafe; color: #1e40af; }
.rr-actions-cell { white-space: nowrap; }
.rr-btn-sm { padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; margin-right: 4px; }
.rr-btn-sm--edit { background: #e8f4fd; color: #1a73e8; }
.rr-btn-sm--delete { background: #fee2e2; color: #dc2626; }
.rr-loading, .rr-empty { text-align: center; padding: 40px; color: #9ca3af; }
.rr-error { color: #dc2626; padding: 16px 0; }
.rr-toast { padding: 10px 16px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }
.rr-toast--ok { background: #d1fae5; color: #065f46; }
.rr-toast--error { background: #fee2e2; color: #991b1b; }
</style>
