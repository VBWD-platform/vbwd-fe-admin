<template>
  <div class="rrf-overlay">
    <div class="rrf-modal">
      <div class="rrf-header">
        <h2 class="rrf-title">
          {{ isEdit ? 'Edit Rule' : 'Add Routing Rule' }}
        </h2>
        <button
          class="rrf-close"
          @click="$emit('cancel')"
        >
          ×
        </button>
      </div>

      <form
        class="rrf-form"
        @submit.prevent="submit"
      >
        <!-- Name -->
        <div class="rrf-field">
          <label class="rrf-label">Name *</label>
          <input
            v-model="form.name"
            class="rrf-input"
            type="text"
            required
            data-testid="rule-name"
          >
        </div>

        <!-- Priority -->
        <div class="rrf-field rrf-field--half">
          <label class="rrf-label">Priority</label>
          <input
            v-model.number="form.priority"
            class="rrf-input"
            type="number"
            min="0"
            data-testid="rule-priority"
          >
          <p class="rrf-hint">
            Lower = evaluated first
          </p>
        </div>

        <!-- Match Type -->
        <div class="rrf-field">
          <label class="rrf-label">Match Type *</label>
          <select
            v-model="form.match_type"
            class="rrf-select"
            data-testid="rule-match-type"
          >
            <option value="default">Default (always matches)</option>
            <option value="language">Language</option>
            <option value="ip_range">IP Range</option>
            <option value="country">Country Code</option>
            <option value="path_prefix">Path Prefix</option>
            <option value="cookie">Cookie</option>
          </select>
        </div>

        <!-- Match Value (hidden for default) -->
        <div
          v-if="form.match_type !== 'default'"
          class="rrf-field"
        >
          <label class="rrf-label">Match Value *</label>
          <input
            v-model="form.match_value"
            class="rrf-input"
            type="text"
            :placeholder="matchValuePlaceholder"
            data-testid="rule-match-value"
          >
        </div>

        <!-- Target Slug -->
        <div class="rrf-field">
          <label class="rrf-label">Target Slug *</label>
          <input
            v-model="form.target_slug"
            class="rrf-input"
            type="text"
            placeholder="e.g. de/home or /pricing"
            data-testid="rule-target-slug"
          >
        </div>

        <!-- Redirect Code -->
        <div class="rrf-field">
          <label class="rrf-label">Redirect Type</label>
          <div class="rrf-radio-group">
            <label>
              <input
                v-model.number="form.redirect_code"
                type="radio"
                :value="302"
              > 302 Temporary
            </label>
            <label>
              <input
                v-model.number="form.redirect_code"
                type="radio"
                :value="301"
              > 301 Permanent
            </label>
          </div>
        </div>

        <!-- Is Rewrite -->
        <div class="rrf-field rrf-field--checkbox">
          <label>
            <input
              v-model="form.is_rewrite"
              type="checkbox"
              data-testid="rule-is-rewrite"
            >
            Transparent rewrite (URL stays, nginx proxies internally)
          </label>
        </div>

        <!-- Layer -->
        <div class="rrf-field">
          <label class="rrf-label">Evaluation Layer</label>
          <div class="rrf-radio-group">
            <label>
              <input
                v-model="form.layer"
                type="radio"
                value="middleware"
              > Middleware (instant)
            </label>
            <label>
              <input
                v-model="form.layer"
                type="radio"
                value="nginx"
              > Nginx (requires reload)
            </label>
          </div>
        </div>

        <!-- Active -->
        <div class="rrf-field rrf-field--checkbox">
          <label>
            <input
              v-model="form.is_active"
              type="checkbox"
              data-testid="rule-is-active"
            >
            Active
          </label>
        </div>

        <p
          v-if="error"
          class="rrf-error"
          data-testid="form-error"
        >
          {{ error }}
        </p>

        <div class="rrf-actions">
          <button
            type="button"
            class="rrf-btn rrf-btn--secondary"
            @click="$emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rrf-btn rrf-btn--primary"
            :disabled="saving"
            data-testid="form-submit"
          >
            {{ saving ? 'Saving…' : (isEdit ? 'Update' : 'Create') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import type { RoutingRule, RoutingRulePayload } from '@/stores/routingRules';

interface Props {
  rule?: RoutingRule;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'saved', rule: RoutingRule): void;
  (e: 'cancel'): void;
}>();

const isEdit = computed(() => !!props.rule);
const saving = ref(false);
const error = ref('');

const form = reactive<RoutingRulePayload>({
  name: props.rule?.name ?? '',
  is_active: props.rule?.is_active ?? true,
  priority: props.rule?.priority ?? 0,
  match_type: props.rule?.match_type ?? 'default',
  match_value: props.rule?.match_value ?? null,
  target_slug: props.rule?.target_slug ?? '',
  redirect_code: props.rule?.redirect_code ?? 302,
  is_rewrite: props.rule?.is_rewrite ?? false,
  layer: props.rule?.layer ?? 'middleware',
});

const MATCH_VALUE_PLACEHOLDERS: Record<string, string> = {
  language: 'de  (ISO 639-1 code)',
  ip_range: '203.0.113.0/24',
  country: 'DE,AT,CH  (comma-separated ISO 3166-1)',
  path_prefix: '/old-pricing',
  cookie: 'vbwd_lang=de',
};

const matchValuePlaceholder = computed(() => MATCH_VALUE_PLACEHOLDERS[form.match_type] ?? '');

async function submit() {
  saving.value = true;
  error.value = '';
  try {
    emit('saved', { ...form, id: props.rule?.id ?? '', created_at: null, updated_at: null });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Save failed';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.rrf-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.rrf-modal {
  background: #fff; border-radius: 10px; width: 560px; max-width: 95vw;
  max-height: 90vh; overflow-y: auto; padding: 28px;
}
.rrf-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.rrf-title { font-size: 1.2rem; color: #2c3e50; margin: 0; }
.rrf-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #9ca3af; line-height: 1; }
.rrf-field { margin-bottom: 16px; }
.rrf-field--half { max-width: 180px; }
.rrf-field--checkbox { margin-bottom: 12px; }
.rrf-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 5px; }
.rrf-input, .rrf-select { width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
.rrf-hint { font-size: 12px; color: #9ca3af; margin: 3px 0 0; }
.rrf-radio-group { display: flex; gap: 16px; font-size: 14px; }
.rrf-radio-group label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.rrf-error { color: #dc2626; font-size: 13px; margin: 8px 0; }
.rrf-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.rrf-btn { padding: 8px 20px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; }
.rrf-btn:disabled { opacity: .6; cursor: default; }
.rrf-btn--primary { background: #3498db; color: #fff; }
.rrf-btn--primary:hover:not(:disabled) { background: #2980b9; }
.rrf-btn--secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
.rrf-btn--secondary:hover { background: #e5e7eb; }
</style>
