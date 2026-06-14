<template>
  <div
    class="custom-fields-settings"
    data-testid="custom-fields-settings"
  >
    <div class="settings-header">
      <h2>{{ $t('tagsCustomFields.pageTitle') }}</h2>
    </div>

    <div
      class="tabs-container"
      data-testid="cf-settings-tabs"
    >
      <button
        data-testid="tab-custom-fields"
        class="tab-btn"
        :class="{ active: activeTab === 'customFields' }"
        @click="activeTab = 'customFields'"
      >
        {{ $t('tagsCustomFields.tabCustomFields') }}
      </button>
      <button
        data-testid="tab-global-tags"
        class="tab-btn"
        :class="{ active: activeTab === 'globalTags' }"
        @click="activeTab = 'globalTags'"
      >
        {{ $t('tagsCustomFields.tabGlobalTags') }}
      </button>
    </div>

    <!-- ── Custom fields tab ─────────────────────────────────────────────── -->
    <section
      v-show="activeTab === 'customFields'"
      data-testid="custom-fields-tab"
    >
      <div class="toolbar">
        <input
          v-model="cfSearch"
          class="form-control quick-search"
          data-testid="cf-quick-search"
          :placeholder="$t('tagsCustomFields.quickSearch')"
        >
        <select
          v-model="cfEntityFilter"
          class="form-control"
          data-testid="cf-filter-entity"
          @change="reloadCustomFields"
        >
          <option value="">
            {{ $t('tagsCustomFields.allEntities') }}
          </option>
          <option
            v-for="type in store.entityTypes"
            :key="type.entity_type"
            :value="type.entity_type"
          >
            {{ type.label }}
          </option>
        </select>
        <select
          v-model="cfTypeFilter"
          class="form-control"
          data-testid="cf-filter-type"
          @change="reloadCustomFields"
        >
          <option value="">
            {{ $t('tagsCustomFields.allTypes') }}
          </option>
          <option
            v-for="type in FIELD_TYPES"
            :key="type"
            :value="type"
          >
            {{ type }}
          </option>
        </select>
        <Button
          variant="primary"
          data-testid="cf-create-btn"
          @click="showCfForm = !showCfForm"
        >
          {{ $t('tagsCustomFields.createCustomField') }}
        </Button>
        <ImportExportControls
          :api="dataExchangeApi"
          entity-key="custom_field_defs"
          :can-export="true"
          :can-import="true"
        />
      </div>

      <form
        v-if="showCfForm"
        class="create-form"
        data-testid="cf-create-form"
        @submit.prevent="submitCustomField"
      >
        <input
          v-model="cfForm.key"
          class="form-control"
          data-testid="cf-form-key"
          :placeholder="$t('tagsCustomFields.fieldKey')"
          required
        >
        <input
          v-model="cfForm.label"
          class="form-control"
          data-testid="cf-form-label"
          :placeholder="$t('tagsCustomFields.fieldLabel')"
          required
        >
        <select
          v-model="cfForm.entity_type"
          class="form-control"
          data-testid="cf-form-entity"
          required
        >
          <option
            v-for="type in store.entityTypes"
            :key="type.entity_type"
            :value="type.entity_type"
          >
            {{ type.label }}
          </option>
        </select>
        <select
          v-model="cfForm.type"
          class="form-control"
          data-testid="cf-form-type"
        >
          <option
            v-for="type in FIELD_TYPES"
            :key="type"
            :value="type"
          >
            {{ type }}
          </option>
        </select>
        <input
          v-model.number="cfForm.sort_order"
          type="number"
          class="form-control"
          data-testid="cf-form-sort"
          :placeholder="$t('tagsCustomFields.fieldSortOrder')"
        >
        <Button
          type="submit"
          variant="primary"
          data-testid="cf-form-submit"
        >
          {{ $t('common.create') }}
        </Button>
      </form>

      <div class="bulk-bar">
        <Button
          variant="danger"
          data-testid="cf-bulk-delete"
          :disabled="!selectedCfIds.length"
          @click="bulkDeleteCustomFields"
        >
          {{ $t('tagsCustomFields.deleteSelected') }}
        </Button>
        <Button
          variant="secondary"
          data-testid="cf-bulk-activate"
          :disabled="!selectedCfIds.length"
          @click="bulkSetActive(true)"
        >
          {{ $t('tagsCustomFields.activateSelected') }}
        </Button>
        <Button
          variant="secondary"
          data-testid="cf-bulk-deactivate"
          :disabled="!selectedCfIds.length"
          @click="bulkSetActive(false)"
        >
          {{ $t('tagsCustomFields.deactivateSelected') }}
        </Button>
      </div>

      <table
        class="catalog-table"
        data-testid="cf-table"
      >
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                data-testid="cf-select-all"
                @change="toggleAllCf(($event.target as HTMLInputElement).checked)"
              >
            </th>
            <th @click="sortCf('key')">
              {{ $t('tagsCustomFields.colKey') }}
            </th>
            <th @click="sortCf('label')">
              {{ $t('tagsCustomFields.colLabel') }}
            </th>
            <th @click="sortCf('entity_type')">
              {{ $t('tagsCustomFields.colParentEntity') }}
            </th>
            <th @click="sortCf('type')">
              {{ $t('tagsCustomFields.colType') }}
            </th>
            <th>{{ $t('tagsCustomFields.colOptions') }}</th>
            <th @click="sortCf('sort_order')">
              {{ $t('tagsCustomFields.colSortOrder') }}
            </th>
            <th @click="sortCf('is_active')">
              {{ $t('tagsCustomFields.colActive') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in visibleCustomFields"
            :key="row.id"
            data-testid="cf-row"
          >
            <td>
              <input
                type="checkbox"
                :value="row.id"
                :checked="selectedCfIds.includes(row.id)"
                :data-testid="`cf-select-${row.id}`"
                @change="toggleCf(row.id)"
              >
            </td>
            <td>{{ row.key }}</td>
            <td>{{ row.label }}</td>
            <td>{{ row.entity_type }}</td>
            <td>{{ row.type }}</td>
            <td>{{ (row.options || []).join(', ') }}</td>
            <td>{{ row.sort_order }}</td>
            <td>{{ row.is_active ? '✓' : '—' }}</td>
          </tr>
          <tr v-if="!visibleCustomFields.length">
            <td
              colspan="8"
              class="no-rows"
            >
              {{ $t('tagsCustomFields.noRows') }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ── Global tags tab ───────────────────────────────────────────────── -->
    <section
      v-show="activeTab === 'globalTags'"
      data-testid="global-tags-tab"
    >
      <div class="toolbar">
        <input
          v-model="tagSearch"
          class="form-control quick-search"
          data-testid="tag-quick-search"
          :placeholder="$t('tagsCustomFields.quickSearch')"
        >
        <select
          v-model="tagParentFilter"
          class="form-control"
          data-testid="tag-filter-parent"
          @change="reloadTags"
        >
          <option value="">
            {{ $t('tagsCustomFields.allEntities') }}
          </option>
          <option
            v-for="type in store.entityTypes"
            :key="type.entity_type"
            :value="type.entity_type"
          >
            {{ type.label }}
          </option>
        </select>
        <Button
          variant="primary"
          data-testid="tag-create-btn"
          @click="showTagForm = !showTagForm"
        >
          {{ $t('tagsCustomFields.createTag') }}
        </Button>
        <ImportExportControls
          :api="dataExchangeApi"
          entity-key="tags"
          :can-export="true"
          :can-import="true"
        />
      </div>

      <form
        v-if="showTagForm"
        class="create-form"
        data-testid="tag-create-form"
        @submit.prevent="submitTag"
      >
        <input
          v-model="tagForm.slug"
          class="form-control"
          data-testid="tag-form-slug"
          :placeholder="$t('tagsCustomFields.fieldSlug')"
          required
        >
        <input
          v-model="tagForm.name"
          class="form-control"
          data-testid="tag-form-name"
          :placeholder="$t('tagsCustomFields.fieldName')"
          required
        >
        <select
          v-model="tagForm.parent_entity_type"
          class="form-control"
          data-testid="tag-form-parent"
        >
          <option :value="null">
            {{ $t('tagsCustomFields.globalScope') }}
          </option>
          <option
            v-for="type in store.entityTypes"
            :key="type.entity_type"
            :value="type.entity_type"
          >
            {{ type.label }}
          </option>
        </select>
        <input
          v-model="tagForm.color"
          class="form-control"
          data-testid="tag-form-color"
          :placeholder="$t('tagsCustomFields.fieldColor')"
        >
        <Button
          type="submit"
          variant="primary"
          data-testid="tag-form-submit"
        >
          {{ $t('common.create') }}
        </Button>
      </form>

      <div class="bulk-bar">
        <Button
          variant="danger"
          data-testid="tag-bulk-delete"
          :disabled="!selectedTagSlugs.length"
          @click="bulkDeleteTags"
        >
          {{ $t('tagsCustomFields.deleteSelected') }}
        </Button>
      </div>

      <table
        class="catalog-table"
        data-testid="tag-table"
      >
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                data-testid="tag-select-all"
                @change="toggleAllTags(($event.target as HTMLInputElement).checked)"
              >
            </th>
            <th @click="sortTags('name')">
              {{ $t('tagsCustomFields.colName') }}
            </th>
            <th @click="sortTags('slug')">
              {{ $t('tagsCustomFields.colSlug') }}
            </th>
            <th @click="sortTags('parent_entity_type')">
              {{ $t('tagsCustomFields.colParentType') }}
            </th>
            <th @click="sortTags('stats')">
              {{ $t('tagsCustomFields.colStats') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in visibleTags"
            :key="row.slug"
            data-testid="tag-row"
          >
            <td>
              <input
                type="checkbox"
                :value="row.slug"
                :checked="selectedTagSlugs.includes(row.slug)"
                :data-testid="`tag-select-${row.slug}`"
                @change="toggleTag(row.slug)"
              >
            </td>
            <td>{{ row.name }}</td>
            <td>{{ row.slug }}</td>
            <td>{{ row.parent_entity_type || '' }}</td>
            <td data-testid="tag-stats">
              {{ row.stats }}
            </td>
          </tr>
          <tr v-if="!visibleTags.length">
            <td
              colspan="5"
              class="no-rows"
            >
              {{ $t('tagsCustomFields.noRows') }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Button, ImportExportControls } from 'vbwd-view-component';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import {
  useTagsCustomFieldsStore,
  type CustomFieldDefRow,
  type TagRow,
} from '@/stores/tagsCustomFields';

const FIELD_TYPES = ['text', 'number', 'bool', 'date', 'select', 'multiselect'];

const store = useTagsCustomFieldsStore();
const dataExchangeApi = createDataExchangeApi();

const activeTab = ref<'customFields' | 'globalTags'>('customFields');

// custom-fields tab state
const cfSearch = ref('');
const cfEntityFilter = ref('');
const cfTypeFilter = ref('');
const selectedCfIds = ref<string[]>([]);
const showCfForm = ref(false);
const cfSortKey = ref<keyof CustomFieldDefRow>('sort_order');
const cfSortAsc = ref(true);
const cfForm = reactive({ key: '', label: '', entity_type: '', type: 'text', sort_order: 0 });

// global-tags tab state
const tagSearch = ref('');
const tagParentFilter = ref('');
const selectedTagSlugs = ref<string[]>([]);
const showTagForm = ref(false);
const tagSortKey = ref<keyof TagRow>('name');
const tagSortAsc = ref(true);
const tagForm = reactive({
  slug: '',
  name: '',
  parent_entity_type: null as string | null,
  color: '',
});

function matchesSearch(haystack: string[], needle: string): boolean {
  if (!needle) return true;
  const lower = needle.toLowerCase();
  return haystack.some((value) => value.toLowerCase().includes(lower));
}

function sortRows<T>(rows: T[], key: keyof T, ascending: boolean): T[] {
  return [...rows].sort((left, right) => {
    const a = left[key];
    const b = right[key];
    if (a === b) return 0;
    const order = (a ?? '') < (b ?? '') ? -1 : 1;
    return ascending ? order : -order;
  });
}

const visibleCustomFields = computed(() =>
  sortRows(
    store.customFields.filter((row) =>
      matchesSearch([row.key, row.label], cfSearch.value),
    ),
    cfSortKey.value,
    cfSortAsc.value,
  ),
);

const visibleTags = computed(() =>
  sortRows(
    store.tags.filter((row) => matchesSearch([row.slug, row.name], tagSearch.value)),
    tagSortKey.value,
    tagSortAsc.value,
  ),
);

function sortCf(key: keyof CustomFieldDefRow): void {
  cfSortAsc.value = cfSortKey.value === key ? !cfSortAsc.value : true;
  cfSortKey.value = key;
}

function sortTags(key: keyof TagRow): void {
  tagSortAsc.value = tagSortKey.value === key ? !tagSortAsc.value : true;
  tagSortKey.value = key;
}

async function reloadCustomFields(): Promise<void> {
  await store.fetchCustomFields({
    entityType: cfEntityFilter.value || undefined,
    type: cfTypeFilter.value || undefined,
  });
}

async function reloadTags(): Promise<void> {
  await store.fetchTags({ parentEntityType: tagParentFilter.value || undefined });
}

function toggleCf(id: string): void {
  selectedCfIds.value = selectedCfIds.value.includes(id)
    ? selectedCfIds.value.filter((current) => current !== id)
    : [...selectedCfIds.value, id];
}

function toggleAllCf(checked: boolean): void {
  selectedCfIds.value = checked ? visibleCustomFields.value.map((row) => row.id) : [];
}

function toggleTag(slug: string): void {
  selectedTagSlugs.value = selectedTagSlugs.value.includes(slug)
    ? selectedTagSlugs.value.filter((current) => current !== slug)
    : [...selectedTagSlugs.value, slug];
}

function toggleAllTags(checked: boolean): void {
  selectedTagSlugs.value = checked ? visibleTags.value.map((row) => row.slug) : [];
}

async function bulkDeleteCustomFields(): Promise<void> {
  await store.bulkDeleteCustomFields(selectedCfIds.value);
  selectedCfIds.value = [];
  await reloadCustomFields();
}

async function bulkSetActive(isActive: boolean): Promise<void> {
  await Promise.all(
    selectedCfIds.value.map((id) => store.setCustomFieldActive(id, isActive)),
  );
  selectedCfIds.value = [];
  await reloadCustomFields();
}

async function bulkDeleteTags(): Promise<void> {
  await store.bulkDeleteTags(selectedTagSlugs.value);
  selectedTagSlugs.value = [];
  await reloadTags();
}

async function submitCustomField(): Promise<void> {
  await store.createCustomField({ ...cfForm });
  showCfForm.value = false;
  cfForm.key = '';
  cfForm.label = '';
  await reloadCustomFields();
}

async function submitTag(): Promise<void> {
  await store.createTag({ ...tagForm });
  showTagForm.value = false;
  tagForm.slug = '';
  tagForm.name = '';
  await reloadTags();
}

onMounted(async () => {
  await store.fetchEntityTypes();
  await Promise.all([reloadCustomFields(), reloadTags()]);
});
</script>

<style scoped>
.custom-fields-settings {
  background: white;
  padding: 1.25rem;
  border-radius: 0.5rem;
}

.settings-header {
  margin-bottom: 1.25rem;
}

.settings-header h2 {
  margin: 0;
  color: var(--vbwd-color-text-primary, #2c3e50);
}

.tabs-container {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--vbwd-color-border, #e5e7eb);
  margin-bottom: 1.25rem;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vbwd-color-text-secondary, #666);
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--vbwd-color-primary, #2563eb);
}

.tab-btn.active {
  color: var(--vbwd-color-primary, #2563eb);
  border-bottom-color: var(--vbwd-color-primary, #2563eb);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.form-control {
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  font-family: inherit;
  color: var(--vbwd-color-text, #374151);
  background: white;
  border: 1px solid var(--vbwd-color-border, #e5e7eb);
  border-radius: var(--vbwd-input-radius, 0.375rem);
}

.form-control:focus {
  outline: none;
  border-color: var(--vbwd-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px var(--vbwd-color-primary-light, rgba(59, 130, 246, 0.2));
}

.quick-search {
  flex: 1;
  min-width: 12rem;
}

.create-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: var(--vbwd-color-surface, #f9fafb);
  border-radius: 0.375rem;
}

.bulk-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.catalog-table {
  width: 100%;
  border-collapse: collapse;
}

.catalog-table th {
  text-align: left;
  cursor: pointer;
  padding: 0.5rem;
  border-bottom: 1px solid var(--vbwd-color-border, #e5e7eb);
}

.catalog-table td {
  padding: 0.5rem;
  border-bottom: 1px solid var(--vbwd-color-border-light, #f3f4f6);
}

.no-rows {
  text-align: center;
  color: var(--vbwd-color-text-secondary, #666);
}
</style>
