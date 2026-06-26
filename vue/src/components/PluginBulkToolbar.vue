<template>
  <div
    v-if="selectedCount > 0"
    class="bulk-toolbar"
    :data-testid="`${testidPrefix}-bulk-toolbar`"
  >
    <span
      class="bulk-count"
      :data-testid="`${testidPrefix}-bulk-count`"
    >
      {{ t('common.table.bulkSelectedCount', { count: selectedCount }) }}
    </span>
    <button
      type="button"
      class="action-btn activate-btn"
      :data-testid="`${testidPrefix}-bulk-activate`"
      @click="$emit('activate')"
    >
      {{ t('common.table.activateSelected') }}
    </button>
    <button
      type="button"
      class="action-btn deactivate-btn"
      :data-testid="`${testidPrefix}-bulk-deactivate`"
      @click="$emit('deactivate')"
    >
      {{ t('common.table.deactivateSelected') }}
    </button>
    <button
      v-if="showSelectAllMatching"
      type="button"
      class="link-btn"
      :data-testid="`${testidPrefix}-select-all-matching`"
      @click="$emit('select-all-matching')"
    >
      {{ t('common.table.selectAllMatching', { count: matchingTotal }) }}
    </button>
    <button
      type="button"
      class="link-btn"
      :data-testid="`${testidPrefix}-clear-selection`"
      @click="$emit('clear')"
    >
      {{ t('common.table.clearSelection') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  /** Number of currently-selected rows (across all pages). */
  selectedCount: number;
  /** Total rows matching the current search (for the "select all N" copy). */
  matchingTotal: number;
  /** Show the "Select all N matching" affordance (page full + more pages). */
  showSelectAllMatching: boolean;
  /** data-testid namespace, e.g. "backend-plugins". */
  testidPrefix: string;
}>();

defineEmits<{
  (event: 'activate'): void;
  (event: 'deactivate'): void;
  (event: 'select-all-matching'): void;
  (event: 'clear'): void;
}>();

const { t } = useI18n();
</script>

<style scoped>
.bulk-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.action-btn.activate-btn {
  background: #e8f5e9;
  color: #388e3c;
}

.action-btn.activate-btn:hover {
  background: #c8e6c9;
}

.action-btn.deactivate-btn {
  background: #fff3e0;
  color: #f57c00;
}

.action-btn.deactivate-btn:hover {
  background: #ffe0b2;
}

.link-btn {
  background: none;
  border: none;
  color: #4338ca;
  cursor: pointer;
  font-size: 13px;
  text-decoration: underline;
  padding: 0;
}
</style>
