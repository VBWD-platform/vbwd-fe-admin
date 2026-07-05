<template>
  <div
    class="product-type-fields"
    data-testid="product-type-field-values"
  >
    <div
      v-for="field in orderedFields"
      :key="field.slug"
      class="type-field-group"
      :data-testid="`type-field-group-${field.slug}`"
    >
      <label class="type-field-label">
        {{ field.label }}
        <span
          v-if="field.required"
          class="required-marker"
          :data-testid="`type-field-required-${field.slug}`"
        >*</span>
      </label>

      <!-- textarea / text -->
      <textarea
        v-if="field.type === 'textarea' || field.type === 'text'"
        :value="stringValue(field.slug)"
        rows="3"
        :data-testid="`type-field-${field.slug}`"
        @input="setValue(field.slug, ($event.target as HTMLTextAreaElement).value)"
      />

      <!-- boolean -->
      <input
        v-else-if="field.type === 'boolean'"
        type="checkbox"
        :checked="!!modelValue[field.slug]"
        :data-testid="`type-field-${field.slug}`"
        @change="setValue(field.slug, ($event.target as HTMLInputElement).checked)"
      >

      <!-- select -->
      <select
        v-else-if="field.type === 'select'"
        :value="stringValue(field.slug)"
        :data-testid="`type-field-${field.slug}`"
        @change="setValue(field.slug, ($event.target as HTMLSelectElement).value)"
      >
        <option value="">
          —
        </option>
        <option
          v-for="option in field.options"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </select>

      <!-- multiselect (a checkbox per option, value is an array) -->
      <div
        v-else-if="field.type === 'multiselect'"
        class="multiselect-options"
        :data-testid="`type-field-${field.slug}`"
      >
        <label
          v-for="option in field.options"
          :key="option"
          class="multiselect-option"
        >
          <input
            type="checkbox"
            :checked="isSelected(field.slug, option)"
            :data-testid="`type-field-${field.slug}-${option}`"
            @change="toggleMultiselect(field.slug, option, ($event.target as HTMLInputElement).checked)"
          >
          <span>{{ option }}</span>
        </label>
      </div>

      <!-- numeric -->
      <input
        v-else-if="isNumericType(field.type)"
        type="number"
        :step="field.type === 'integer' ? '1' : 'any'"
        :value="stringValue(field.slug)"
        :data-testid="`type-field-${field.slug}`"
        @input="setNumber(field.slug, ($event.target as HTMLInputElement).value)"
      >

      <!-- url / string (default) -->
      <input
        v-else
        :type="field.type === 'url' ? 'url' : 'text'"
        :value="stringValue(field.slug)"
        :data-testid="`type-field-${field.slug}`"
        @input="setValue(field.slug, ($event.target as HTMLInputElement).value)"
      >

      <p
        v-if="field.help"
        class="type-field-help"
      >
        {{ field.help }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ProductTypeField } from '../stores/productTypeAdmin';

const props = defineProps<{
  fields: ProductTypeField[];
  modelValue: Record<string, unknown>;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: Record<string, unknown>): void;
}>();

const NUMERIC_TYPES = ['integer', 'number', 'float', 'decimal'];

const orderedFields = computed(() =>
  [...props.fields].sort((first, second) => first.sort_order - second.sort_order),
);

function isNumericType(type: string): boolean {
  return NUMERIC_TYPES.includes(type);
}

function stringValue(slug: string): string {
  const value = props.modelValue[slug];
  return value === undefined || value === null ? '' : String(value);
}

function setValue(slug: string, value: unknown): void {
  emit('update:modelValue', { ...props.modelValue, [slug]: value });
}

function setNumber(slug: string, raw: string): void {
  setValue(slug, raw === '' ? null : Number(raw));
}

function isSelected(slug: string, option: string): boolean {
  const value = props.modelValue[slug];
  return Array.isArray(value) && value.includes(option);
}

function toggleMultiselect(slug: string, option: string, checked: boolean): void {
  const current = Array.isArray(props.modelValue[slug])
    ? [...(props.modelValue[slug] as string[])]
    : [];
  const next = checked
    ? [...current, option]
    : current.filter(existing => existing !== option);
  setValue(slug, next);
}
</script>

<style scoped>
.product-type-fields { display: flex; flex-direction: column; gap: 16px; }
.type-field-group { display: flex; flex-direction: column; gap: 4px; }
.type-field-label { font-size: 13px; font-weight: 600; color: #374151; }
.required-marker { color: #dc2626; margin-left: 2px; }
.type-field-group input[type="text"],
.type-field-group input[type="url"],
.type-field-group input[type="number"],
.type-field-group select,
.type-field-group textarea { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
.multiselect-options { display: flex; flex-wrap: wrap; gap: 12px; }
.multiselect-option { display: flex; align-items: center; gap: 6px; font-weight: 400; }
.type-field-help { font-size: 12px; color: #6b7280; margin: 0; }
</style>
