<template>
  <section
    class="tag-picker form-section"
    data-testid="tag-picker"
  >
    <h3 class="tag-picker-title">
      {{ $t('tagsCustomFields.tagsLabel') }}
    </h3>

    <div
      class="tag-picker-selected"
      data-testid="tag-picker-selected"
    >
      <span
        v-for="slug in selected"
        :key="slug"
        class="tag-picker-chip"
        data-testid="tag-picker-chip"
      >
        {{ tagName(slug) }}
        <button
          type="button"
          class="tag-picker-remove"
          :data-testid="`tag-picker-remove-${slug}`"
          :aria-label="$t('tagsCustomFields.removeTag')"
          @click="removeTag(slug)"
        >
          &times;
        </button>
      </span>
      <span
        v-if="!selected.length"
        class="tag-picker-empty"
      >{{ $t('tagsCustomFields.noTags') }}</span>
    </div>

    <div class="tag-picker-add">
      <input
        v-model="query"
        type="text"
        class="tag-picker-select"
        data-testid="tag-picker-input"
        :placeholder="$t('tagsCustomFields.addTag')"
        @focus="open = true"
        @input="open = true"
        @blur="open = false"
        @keydown.escape="open = false"
      >
      <ul
        v-if="open && (filteredOptions.length || showCreate)"
        class="tag-picker-menu"
        data-testid="tag-picker-menu"
      >
        <li
          v-for="option in filteredOptions"
          :key="option.slug"
          class="tag-picker-menu-item"
          data-testid="tag-picker-option"
          @mousedown.prevent="selectExisting(option.slug)"
        >
          {{ option.name || option.slug }}
        </li>
        <li
          v-if="showCreate"
          class="tag-picker-menu-item tag-picker-menu-item--create"
          data-testid="tag-picker-create"
          @mousedown.prevent="createAndSelect"
        >
          {{ $t('tagsCustomFields.createTag') }} "{{ trimmedQuery }}"
        </li>
      </ul>
    </div>

    <div class="tag-picker-actions">
      <Button
        variant="primary"
        data-testid="tag-picker-save"
        :loading="saving"
        @click="save"
      >
        {{ $t('tagsCustomFields.saveTags') }}
      </Button>
      <span
        v-if="saved"
        class="tag-picker-saved"
        data-testid="tag-picker-saved"
      >{{ $t('common.saved') }}</span>
      <span
        v-if="error"
        class="tag-picker-error"
        data-testid="tag-picker-error"
      >{{ error }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { Button } from 'vbwd-view-component';
import {
  createTag,
  fetchApplicableTags,
  fetchEntityTags,
  saveEntityTags,
  type CatalogTag,
} from '@/api/tagsCustomFieldsApi';

const props = defineProps<{
  entityType: string;
  entityId: string;
}>();

const applicable = ref<CatalogTag[]>([]);
const selected = ref<string[]>([]);
const query = ref('');
const open = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref<string | null>(null);

const availableOptions = computed(() =>
  applicable.value.filter((tag) => !selected.value.includes(tag.slug)),
);

const trimmedQuery = computed(() => query.value.trim());

// Catalog options matching the typed text by name OR slug (case-insensitive).
const filteredOptions = computed(() => {
  const needle = trimmedQuery.value.toLowerCase();
  if (!needle) return availableOptions.value;
  return availableOptions.value.filter(
    (tag) =>
      (tag.name || '').toLowerCase().includes(needle) ||
      tag.slug.toLowerCase().includes(needle),
  );
});

// Offer inline create only when the typed name matches no applicable tag's name
// or slug (case-insensitive) — selected or not.
const showCreate = computed(() => {
  if (!trimmedQuery.value) return false;
  const needle = trimmedQuery.value.toLowerCase();
  return !applicable.value.some(
    (tag) => (tag.name || '').toLowerCase() === needle || tag.slug.toLowerCase() === needle,
  );
});

function tagName(slug: string): string {
  return applicable.value.find((tag) => tag.slug === slug)?.name || slug;
}

function selectExisting(slug: string): void {
  if (slug && !selected.value.includes(slug)) {
    selected.value = [...selected.value, slug];
  }
  query.value = '';
  open.value = false;
}

// Create the typed tag scoped to this entity type, register it locally so its
// chip shows the proper name, then select it. On failure the slug is still added
// (the backend auto-creates unknown slugs as global on the next PUT — data-safe).
async function createAndSelect(): Promise<void> {
  const name = trimmedQuery.value;
  error.value = null;
  try {
    const tag = await createTag(name, props.entityType);
    if (!applicable.value.some((existing) => existing.slug === tag.slug)) {
      applicable.value = [...applicable.value, tag];
    }
    selectExisting(tag.slug);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  }
}

function removeTag(slug: string): void {
  selected.value = selected.value.filter((current) => current !== slug);
}

async function save(): Promise<void> {
  saving.value = true;
  saved.value = false;
  error.value = null;
  try {
    selected.value = await saveEntityTags(
      props.entityType,
      props.entityId,
      selected.value,
    );
    saved.value = true;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    [applicable.value, selected.value] = await Promise.all([
      fetchApplicableTags(props.entityType),
      fetchEntityTags(props.entityType, props.entityId),
    ]);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  }
});

defineExpose({ save });
</script>

<style scoped>
/* Self-contained card so the block is visually separated from sibling
   sections on every host page, mirroring the currency tab's .form-section. */
.tag-picker.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.875rem;
  padding: 1.25rem;
  background: var(--vbwd-color-surface, #fff);
  border: 1px solid var(--vbwd-color-border, #e5e7eb);
  border-radius: var(--vbwd-radius-md, 8px);
}

.tag-picker-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--vbwd-color-text-primary, #2c3e50);
}

.tag-picker-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  min-height: 1.75rem;
}

.tag-picker-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 9999px;
  background-color: var(--vbwd-color-secondary-light, #f3f4f6);
  color: var(--vbwd-color-secondary-dark, #374151);
}

.tag-picker-remove {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  color: inherit;
}

.tag-picker-empty {
  font-size: 0.85rem;
  color: var(--vbwd-color-text-secondary, #666);
}

.tag-picker-add {
  position: relative;
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.tag-picker-menu {
  position: absolute;
  z-index: 20;
  top: 100%;
  left: 0;
  right: 0;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
  max-height: 14rem;
  overflow-y: auto;
  background: var(--vbwd-color-surface, #fff);
  border: 1px solid var(--vbwd-color-border, #e5e7eb);
  border-radius: var(--vbwd-radius-md, 0.375rem);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.tag-picker-menu-item {
  padding: 0.4rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--vbwd-color-text, #374151);
}

.tag-picker-menu-item:hover {
  background: var(--vbwd-color-primary-light, #eff6ff);
}

.tag-picker-menu-item--create {
  border-top: 1px solid var(--vbwd-color-border, #e5e7eb);
  color: var(--vbwd-color-primary, #1d4ed8);
  font-weight: 600;
}

.tag-picker-select {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  font-family: inherit;
  color: var(--vbwd-color-text, #374151);
  background: white;
  border: 1px solid var(--vbwd-color-border, #e5e7eb);
  border-radius: var(--vbwd-input-radius, 0.375rem);
}

.tag-picker-select:focus {
  outline: none;
  border-color: var(--vbwd-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px var(--vbwd-color-primary-light, rgba(59, 130, 246, 0.2));
}

.tag-picker-saved {
  color: var(--vbwd-color-success-dark, #065f46);
  font-size: 0.85rem;
}

.tag-picker-error {
  color: var(--vbwd-color-danger-dark, #991b1b);
  font-size: 0.85rem;
}
</style>
