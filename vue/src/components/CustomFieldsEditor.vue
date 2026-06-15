<template>
  <section
    class="custom-fields-editor form-section"
    data-testid="custom-fields-editor"
  >
    <h3 class="custom-fields-title">
      {{ $t('tagsCustomFields.customFieldsLabel') }}
    </h3>

    <p
      v-if="!defs.length"
      class="custom-fields-empty"
      data-testid="custom-fields-empty"
    >
      {{ $t('tagsCustomFields.noCustomFields') }}
    </p>

    <div
      v-for="def in defs"
      :key="def.key"
      class="custom-field-row"
      :data-testid="`custom-field-${def.key}`"
    >
      <label
        class="custom-field-field-label"
        :for="`cf-${def.key}`"
      >{{ def.label }}</label>

      <input
        v-if="def.type === 'text'"
        :id="`cf-${def.key}`"
        v-model="values[def.key]"
        type="text"
        class="custom-field-input"
        :data-testid="`custom-field-input-${def.key}`"
      >
      <input
        v-else-if="def.type === 'number'"
        :id="`cf-${def.key}`"
        v-model.number="values[def.key]"
        type="number"
        class="custom-field-input"
        :data-testid="`custom-field-input-${def.key}`"
      >
      <label
        v-else-if="def.type === 'bool'"
        class="custom-field-checkbox"
      >
        <input
          :id="`cf-${def.key}`"
          v-model="values[def.key]"
          type="checkbox"
          :data-testid="`custom-field-input-${def.key}`"
        >
      </label>
      <input
        v-else-if="def.type === 'date'"
        :id="`cf-${def.key}`"
        v-model="values[def.key]"
        type="date"
        class="custom-field-input"
        :data-testid="`custom-field-input-${def.key}`"
      >
      <select
        v-else-if="def.type === 'select'"
        :id="`cf-${def.key}`"
        v-model="values[def.key]"
        class="custom-field-input"
        :data-testid="`custom-field-input-${def.key}`"
      >
        <option value="">
          --
        </option>
        <option
          v-for="option in optionsOf(def)"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </select>
      <select
        v-else-if="def.type === 'multiselect'"
        :id="`cf-${def.key}`"
        v-model="values[def.key]"
        multiple
        class="custom-field-input custom-field-multiselect"
        :data-testid="`custom-field-input-${def.key}`"
      >
        <option
          v-for="option in optionsOf(def)"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </select>
    </div>

    <div
      v-if="defs.length"
      class="custom-fields-actions"
    >
      <Button
        variant="primary"
        data-testid="custom-fields-save"
        :loading="saving"
        @click="save"
      >
        {{ $t('tagsCustomFields.saveCustomFields') }}
      </Button>
      <span
        v-if="saved"
        class="custom-fields-saved"
        data-testid="custom-fields-saved"
      >{{ $t('common.saved') }}</span>
      <span
        v-if="error"
        class="custom-fields-error"
        data-testid="custom-fields-error"
      >{{ error }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Button, type CustomFieldDef } from 'vbwd-view-component';
import {
  fetchFieldDefs,
  fetchEntityCustomFields,
  saveEntityCustomFields,
} from '@/api/tagsCustomFieldsApi';

const props = defineProps<{
  entityType: string;
  entityId: string;
}>();

const defs = ref<CustomFieldDef[]>([]);
const values = reactive<Record<string, unknown>>({});
const saving = ref(false);
const saved = ref(false);
const error = ref<string | null>(null);

function optionsOf(def: CustomFieldDef): string[] {
  return Array.isArray(def.options) ? (def.options as string[]) : [];
}

function defaultFor(def: CustomFieldDef): unknown {
  if (def.type === 'bool') return false;
  if (def.type === 'multiselect') return [];
  return '';
}

/**
 * External write seam (S41): merge supplied values into the live inputs so a
 * parent (e.g. cms-ai's applyPatch) can fill custom fields exactly as if the
 * operator typed them. Only keys with a matching field definition are applied —
 * unknown keys are ignored. Keys absent from the partial are left untouched, so
 * operator edits the patch does not mention are preserved. A subsequent save()
 * persists the merged values through the unchanged save path.
 */
function setValues(partial: Record<string, unknown>): void {
  const knownKeys = new Set(defs.value.map((def) => def.key));
  for (const [key, value] of Object.entries(partial)) {
    if (knownKeys.has(key)) {
      values[key] = value;
    }
  }
}

async function save(): Promise<void> {
  saving.value = true;
  saved.value = false;
  error.value = null;
  try {
    const payload: Record<string, unknown> = {};
    for (const def of defs.value) {
      payload[def.key] = values[def.key];
    }
    const updated = await saveEntityCustomFields(
      props.entityType,
      props.entityId,
      payload,
    );
    Object.assign(values, updated);
    saved.value = true;
  } catch (caught) {
    error.value = extractError(caught);
  } finally {
    saving.value = false;
  }
}

function extractError(caught: unknown): string {
  if (caught && typeof caught === 'object' && 'response' in caught) {
    const response = (caught as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  return caught instanceof Error ? caught.message : String(caught);
}

onMounted(async () => {
  try {
    defs.value = await fetchFieldDefs(props.entityType);
    const current = await fetchEntityCustomFields(props.entityType, props.entityId);
    for (const def of defs.value) {
      values[def.key] = def.key in current ? current[def.key] : defaultFor(def);
    }
  } catch (caught) {
    error.value = extractError(caught);
  }
});

defineExpose({ save, setValues });
</script>

<style scoped>
/* Self-contained card so the block is visually separated from sibling
   sections on every host page, mirroring the currency tab's .form-section. */
.custom-fields-editor.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.875rem;
  padding: 1.25rem;
  background: var(--vbwd-color-surface, #fff);
  border: 1px solid var(--vbwd-color-border, #e5e7eb);
  border-radius: var(--vbwd-radius-md, 8px);
}

.custom-fields-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--vbwd-color-text-primary, #2c3e50);
}

.custom-field-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.custom-field-field-label {
  font-size: 0.85rem;
  color: var(--vbwd-color-text-secondary, #666);
}

.custom-field-input {
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  font-family: inherit;
  color: var(--vbwd-color-text, #374151);
  background: white;
  border: 1px solid var(--vbwd-color-border, #e5e7eb);
  border-radius: var(--vbwd-input-radius, 0.375rem);
}

.custom-field-input:focus {
  outline: none;
  border-color: var(--vbwd-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px var(--vbwd-color-primary-light, rgba(59, 130, 246, 0.2));
}

.custom-field-multiselect {
  min-height: 5rem;
}

.custom-field-checkbox {
  display: inline-flex;
  align-items: center;
}

.custom-fields-empty {
  font-size: 0.85rem;
  color: var(--vbwd-color-text-secondary, #666);
}

.custom-fields-saved {
  color: var(--vbwd-color-success-dark, #065f46);
  font-size: 0.85rem;
}

.custom-fields-error {
  color: var(--vbwd-color-danger-dark, #991b1b);
  font-size: 0.85rem;
}
</style>
