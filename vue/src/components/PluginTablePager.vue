<template>
  <div
    class="table-pager"
    :data-testid="`${testidPrefix}-pager`"
  >
    <label class="rows-per-page">
      {{ t('common.table.rowsPerPage') }}
      <select
        class="rows-per-page-select"
        :value="String(rowsPerPage)"
        :data-testid="`${testidPrefix}-rows-per-page`"
        @change="onRowsChange"
      >
        <option
          v-for="option in options"
          :key="String(option)"
          :value="String(option)"
        >
          {{ option === 'all' ? t('common.table.rowsPerPageAll') : option }}
        </option>
      </select>
    </label>

    <span
      v-if="total > 0"
      class="pager-info"
      :data-testid="`${testidPrefix}-pager-info`"
    >
      {{ t('common.table.showing', { from: pageStart, to: pageEnd, total }) }}
    </span>

    <div
      v-if="pageCount > 1"
      class="pagination"
    >
      <button
        type="button"
        class="page-btn"
        :disabled="page <= 1"
        :data-testid="`${testidPrefix}-prev-page`"
        @click="$emit('update:page', page - 1)"
      >
        {{ t('common.previous') }}
      </button>
      <span class="page-info">
        {{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ pageCount }}
      </span>
      <button
        type="button"
        class="page-btn"
        :disabled="page >= pageCount"
        :data-testid="`${testidPrefix}-next-page`"
        @click="$emit('update:page', page + 1)"
      >
        {{ t('common.next') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { RowsPerPage } from '@/composables/useClientTable';

defineProps<{
  page: number;
  pageCount: number;
  total: number;
  pageStart: number;
  pageEnd: number;
  rowsPerPage: RowsPerPage;
  options: RowsPerPage[];
  testidPrefix: string;
}>();

const emit = defineEmits<{
  (event: 'update:page', page: number): void;
  (event: 'update:rowsPerPage', rowsPerPage: RowsPerPage): void;
}>();

const { t } = useI18n();

function onRowsChange(event: Event): void {
  const raw = (event.target as HTMLSelectElement).value;
  emit('update:rowsPerPage', raw === 'all' ? 'all' : Number(raw));
}
</script>

<style scoped>
.table-pager {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.rows-per-page {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.rows-per-page-select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.pager-info {
  font-size: 14px;
  color: #666;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-left: auto;
}

.page-btn {
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.page-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.page-btn:disabled {
  background: #f8f9fa;
  color: #aaa;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}
</style>
