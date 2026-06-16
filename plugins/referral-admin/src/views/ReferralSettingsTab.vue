<template>
  <div
    class="referral-settings"
    data-testid="referral-settings-tab"
  >
    <div
      v-if="error"
      class="form-error"
      data-testid="referral-settings-error"
    >
      {{ error }}
    </div>

    <!-- Issuer's commission -->
    <section class="settings-block">
      <h3>{{ $t('referralAdmin.commissionBlockTitle') }}</h3>
      <div class="commission-toggle">
        <label
          class="toggle-option"
          :class="{ active: commissionType === 'percent_of_sale' }"
        >
          <input
            v-model="commissionType"
            type="radio"
            value="percent_of_sale"
            data-testid="commission-type-percent"
          >
          {{ $t('referralAdmin.commissionPercent') }}
        </label>
        <label
          class="toggle-option"
          :class="{ active: commissionType === 'absolute_tokens' }"
        >
          <input
            v-model="commissionType"
            type="radio"
            value="absolute_tokens"
            data-testid="commission-type-tokens"
          >
          {{ $t('referralAdmin.commissionTokens') }}
        </label>
      </div>
      <div class="form-group">
        <label>{{ $t('referralAdmin.commissionValue') }}</label>
        <input
          v-model="commissionValue"
          type="number"
          min="0"
          step="0.01"
          class="form-input"
          data-testid="commission-value"
        >
      </div>
    </section>

    <!-- Coupon template -->
    <section class="settings-block">
      <h3>{{ $t('referralAdmin.templateBlockTitle') }}</h3>
      <p class="block-hint">
        {{ $t('referralAdmin.templateBlockHint') }}
      </p>
      <DualListSelector
        v-model="selectedTemplateIds"
        testid="referral-templates"
        :options="templateOptions"
        :available-label="$t('referralAdmin.templatesAvailable')"
        :assigned-label="$t('referralAdmin.templatesSelected')"
      />
    </section>

    <div class="form-actions">
      <button
        class="btn btn--primary"
        data-testid="referral-settings-save"
        :disabled="saving"
        @click="save"
      >
        {{ $t('common.save') }}
      </button>
      <span
        v-if="saved"
        class="saved-hint"
        data-testid="referral-settings-saved"
      >
        {{ $t('referralAdmin.saved') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import DualListSelector from '@/components/DualListSelector.vue';
import { useReferralAdminStore } from '../stores/referralAdmin';

const store = useReferralAdminStore();

const commissionType = ref<'percent_of_sale' | 'absolute_tokens'>('absolute_tokens');
const commissionValue = ref('0');
const selectedTemplateIds = ref<string[]>([]);
const saving = ref(false);
const saved = ref(false);
const error = ref<string | null>(null);

const templateOptions = computed(() =>
  store.templateCoupons.map((coupon) => ({ value: coupon.id, label: coupon.code })),
);

async function load() {
  await Promise.all([store.fetchSettings(), store.fetchTemplateCoupons()]);
  if (store.settings) {
    commissionType.value = store.settings.commission_type;
    commissionValue.value = store.settings.commission_value;
    selectedTemplateIds.value = [...store.settings.selected_template_coupon_ids];
  }
  error.value = store.error;
}

async function save() {
  saving.value = true;
  saved.value = false;
  error.value = null;
  try {
    await store.saveSettings({
      commission_type: commissionType.value,
      commission_value: commissionValue.value,
      selected_template_coupon_ids: selectedTemplateIds.value,
    });
    saved.value = true;
  } catch (saveError) {
    error.value = (saveError as Error).message || 'Save failed';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.referral-settings { padding: 8px 0; }
.settings-block { margin-bottom: 28px; }
.settings-block h3 { margin: 0 0 12px 0; font-size: 16px; }
.block-hint { color: #6b7280; font-size: 13px; margin: 0 0 12px 0; }
.commission-toggle { display: flex; gap: 12px; margin-bottom: 16px; }
.toggle-option { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 14px; }
.toggle-option.active { border-color: #3b82f6; background: #eff6ff; }
.form-group { margin-bottom: 14px; max-width: 280px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; }
.form-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.form-error { background: #f8d7da; color: #721c24; padding: 10px 12px; border-radius: 4px; margin-bottom: 16px; font-size: 14px; }
.form-actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; background: white; }
.btn--primary { background: #3b82f6; color: white; border-color: #3b82f6; }
.btn--primary:disabled { opacity: 0.6; cursor: default; }
.saved-hint { color: #16a34a; font-size: 14px; }
</style>
