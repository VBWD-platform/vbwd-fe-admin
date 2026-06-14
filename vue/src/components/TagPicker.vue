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
      <select
        v-model="pendingSlug"
        class="tag-picker-select"
        data-testid="tag-picker-select"
      >
        <option value="">
          {{ $t('tagsCustomFields.addTag') }}
        </option>
        <option
          v-for="option in availableOptions"
          :key="option.slug"
          :value="option.slug"
        >
          {{ option.name || option.slug }}
        </option>
      </select>
      <Button
        variant="secondary"
        data-testid="tag-picker-add-btn"
        :disabled="!pendingSlug"
        @click="addPending"
      >
        {{ $t('common.add') }}
      </Button>
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
const pendingSlug = ref('');
const saving = ref(false);
const saved = ref(false);
const error = ref<string | null>(null);

const availableOptions = computed(() =>
  applicable.value.filter((tag) => !selected.value.includes(tag.slug)),
);

function tagName(slug: string): string {
  return applicable.value.find((tag) => tag.slug === slug)?.name || slug;
}

function addPending(): void {
  if (pendingSlug.value && !selected.value.includes(pendingSlug.value)) {
    selected.value = [...selected.value, pendingSlug.value];
  }
  pendingSlug.value = '';
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
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
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
