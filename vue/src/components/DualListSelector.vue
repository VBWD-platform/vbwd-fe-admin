<template>
  <div
    class="dual-list"
    :data-testid="testid ? `dual-list-${testid}` : 'dual-list'"
  >
    <div class="dual-list-panel">
      <h4>{{ availableLabel }}</h4>
      <div class="dual-list-items">
        <div
          v-for="opt in available"
          :key="opt.value"
          class="dual-list-item"
          :data-testid="`dual-list-available-${opt.value}`"
        >
          <span>{{ opt.label }}</span>
          <button
            type="button"
            class="assign-btn"
            :data-testid="`dual-list-assign-${opt.value}`"
            @click="assign(opt.value)"
          >
            +
          </button>
        </div>
        <p
          v-if="available.length === 0"
          class="empty-hint"
        >
          {{ emptyAvailableLabel }}
        </p>
      </div>
    </div>

    <div class="dual-list-panel">
      <h4>{{ assignedLabel }}</h4>
      <div class="dual-list-items">
        <div
          v-for="opt in assigned"
          :key="opt.value"
          class="dual-list-item"
          :data-testid="`dual-list-assigned-${opt.value}`"
        >
          <span>{{ opt.label }}</span>
          <button
            type="button"
            class="unassign-btn"
            :data-testid="`dual-list-unassign-${opt.value}`"
            @click="unassign(opt.value)"
          >
            &times;
          </button>
        </div>
        <p
          v-if="assigned.length === 0"
          class="empty-hint"
        >
          {{ emptyAssignedLabel }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface DualListOption {
  value: string;
  label: string;
}

const props = withDefaults(defineProps<{
  /** Currently selected values (the "assigned" / right-hand side) */
  modelValue: string[];
  /** Full set of selectable options */
  options: DualListOption[];
  /** Optional data-testid suffix so multiple selectors can coexist */
  testid?: string;
  availableLabel?: string;
  assignedLabel?: string;
  emptyAvailableLabel?: string;
  emptyAssignedLabel?: string;
}>(), {
  testid: '',
  availableLabel: 'Available',
  assignedLabel: 'Selected',
  emptyAvailableLabel: 'Nothing left to add',
  emptyAssignedLabel: 'None selected',
});

const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>();

const selected = computed(() => new Set(props.modelValue));

// Assigned: keep the order the values were selected in; fall back to label.
const assigned = computed<DualListOption[]>(() =>
  props.modelValue
    .map(v => props.options.find(o => o.value === v) ?? { value: v, label: v })
);

const available = computed<DualListOption[]>(() =>
  props.options.filter(o => !selected.value.has(o.value))
);

function assign(value: string): void {
  if (selected.value.has(value)) return;
  emit('update:modelValue', [...props.modelValue, value]);
}

function unassign(value: string): void {
  emit('update:modelValue', props.modelValue.filter(v => v !== value));
}
</script>

<style scoped>
.dual-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.dual-list-panel h4 {
  margin: 0 0 10px 0;
  color: #555;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dual-list-items {
  border: 1px solid #e9ecef;
  border-radius: 4px;
  min-height: 100px;
  max-height: 250px;
  overflow-y: auto;
  padding: 8px;
}

.dual-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.dual-list-item:hover {
  background: #f8f9fa;
}

.dual-list-item span:first-child {
  flex: 1;
}

.assign-btn,
.unassign-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.assign-btn {
  background: #d4edda;
  color: #155724;
}

.assign-btn:hover {
  background: #c3e6cb;
}

.unassign-btn {
  background: #f8d7da;
  color: #721c24;
}

.unassign-btn:hover {
  background: #f5c6cb;
}

.empty-hint {
  text-align: center;
  color: #999;
  font-size: 12px;
  padding: 12px 0;
  margin: 0;
}
</style>
