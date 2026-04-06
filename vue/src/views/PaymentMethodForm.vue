<template>
  <div class="payment-method-form-view">
    <div class="page-header">
      <h2>{{ isEdit ? $t('paymentMethods.editMethod') : $t('paymentMethods.createMethod') }}</h2>
    </div>

    <div
      v-if="loading"
      class="loading-state"
    >
      {{ $t('common.loading') }}
    </div>

    <form
      v-else
      class="form"
      @submit.prevent="handleSubmit"
    >
      <!-- Basic Info -->
      <div class="form-section">
        <h3>Basic Information</h3>

        <div class="form-group">
          <label for="code">{{ $t('paymentMethods.code') }} *</label>
          <input
            id="code"
            v-model="form.code"
            name="code"
            type="text"
            :placeholder="$t('paymentMethods.codePlaceholder')"
            :disabled="isEdit"
            :readonly="isEdit"
            data-testid="code-input"
            required
          >
          <small v-if="!isEdit">{{ $t('paymentMethods.codeHelp') }}</small>
          <span
            v-if="errors.code"
            class="error"
            data-testid="validation-error"
          >{{ errors.code }}</span>
        </div>

        <div class="form-group">
          <label for="name">{{ $t('paymentMethods.name') }} *</label>
          <input
            id="name"
            v-model="form.name"
            name="name"
            type="text"
            :placeholder="$t('paymentMethods.namePlaceholder')"
            data-testid="name-input"
            required
          >
          <span
            v-if="errors.name"
            class="error"
            data-testid="validation-error"
          >{{ errors.name }}</span>
        </div>

        <div class="form-group">
          <label for="description">{{ $t('paymentMethods.description') }}</label>
          <textarea
            id="description"
            v-model="form.description"
            name="description"
            :placeholder="$t('paymentMethods.descriptionPlaceholder')"
            rows="3"
            data-testid="description-input"
          />
        </div>

        <div class="form-group">
          <label for="short_description">{{ $t('paymentMethods.shortDescription') }}</label>
          <input
            id="short_description"
            v-model="form.short_description"
            name="short_description"
            type="text"
            :placeholder="$t('paymentMethods.shortDescriptionPlaceholder')"
          >
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="icon">{{ $t('paymentMethods.icon') }}</label>
            <input
              id="icon"
              v-model="form.icon"
              name="icon"
              type="text"
              :placeholder="$t('paymentMethods.iconPlaceholder')"
            >
          </div>

          <div class="form-group">
            <label for="plugin_id">{{ $t('paymentMethods.pluginId') }}</label>
            <input
              id="plugin_id"
              v-model="form.plugin_id"
              name="plugin_id"
              type="text"
              :placeholder="$t('paymentMethods.pluginIdPlaceholder')"
            >
          </div>
        </div>
      </div>

      <!-- Status & Position -->
      <div class="form-section">
        <h3>Status & Position</h3>

        <div class="form-row">
          <div class="form-group checkbox-group">
            <label>
              <input
                id="is_active"
                v-model="form.is_active"
                name="is_active"
                type="checkbox"
                data-testid="is-active-toggle"
              >
              {{ $t('paymentMethods.isActive') }}
            </label>
          </div>

          <div class="form-group">
            <label for="position">{{ $t('paymentMethods.position') }}</label>
            <input
              id="position"
              v-model.number="form.position"
              name="position"
              type="number"
              min="0"
            >
            <small>{{ $t('paymentMethods.positionHelp') }}</small>
          </div>
        </div>
      </div>

      <!-- Amount Restrictions -->
      <div class="form-section">
        <h3>Amount Restrictions</h3>

        <div class="form-row">
          <div class="form-group">
            <label for="min_amount">{{ $t('paymentMethods.minAmount') }}</label>
            <input
              id="min_amount"
              v-model.number="form.min_amount"
              name="min_amount"
              type="number"
              min="0"
              step="0.01"
            >
          </div>

          <div class="form-group">
            <label for="max_amount">{{ $t('paymentMethods.maxAmount') }}</label>
            <input
              id="max_amount"
              v-model.number="form.max_amount"
              name="max_amount"
              type="number"
              min="0"
              step="0.01"
            >
          </div>
        </div>
      </div>

      <!-- Currency & Country Restrictions -->
      <div class="form-section">
        <h3>Currency & Country Restrictions</h3>

        <div class="form-row">
          <div class="form-group">
            <label for="currencies">{{ $t('paymentMethods.currencies') }}</label>
            <input
              id="currencies"
              v-model="currenciesInput"
              name="currencies"
              type="text"
              :placeholder="$t('paymentMethods.currenciesPlaceholder')"
            >
          </div>

          <div class="form-group">
            <label for="countries">{{ $t('paymentMethods.countries') }}</label>
            <input
              id="countries"
              v-model="countriesInput"
              name="countries"
              type="text"
              :placeholder="$t('paymentMethods.countriesPlaceholder')"
            >
          </div>
        </div>
      </div>

      <!-- Fee Configuration -->
      <div class="form-section">
        <h3>Fee Configuration</h3>

        <div class="form-row">
          <div class="form-group">
            <label for="fee_type">{{ $t('paymentMethods.feeType') }}</label>
            <select
              id="fee_type"
              v-model="form.fee_type"
              name="fee_type"
              data-testid="fee-type-select"
            >
              <option value="none">
                {{ $t('paymentMethods.feeTypes.none') }}
              </option>
              <option value="fixed">
                {{ $t('paymentMethods.feeTypes.fixed') }}
              </option>
              <option value="percentage">
                {{ $t('paymentMethods.feeTypes.percentage') }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="fee_amount">{{ $t('paymentMethods.feeAmount') }}</label>
            <input
              id="fee_amount"
              v-model.number="form.fee_amount"
              name="fee_amount"
              type="number"
              :placeholder="$t('paymentMethods.feeAmountPlaceholder')"
              min="0"
              step="0.01"
              :disabled="form.fee_type === 'none'"
              data-testid="fee-amount-input"
            >
          </div>

          <div class="form-group">
            <label for="fee_charged_to">{{ $t('paymentMethods.feeChargedTo') }}</label>
            <select
              id="fee_charged_to"
              v-model="form.fee_charged_to"
              name="fee_charged_to"
              data-testid="fee-charged-to-select"
            >
              <option value="customer">
                {{ $t('paymentMethods.feeChargedToOptions.customer') }}
              </option>
              <option value="merchant">
                {{ $t('paymentMethods.feeChargedToOptions.merchant') }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="form-section">
        <h3>Instructions</h3>

        <div class="form-group">
          <label for="instructions">{{ $t('paymentMethods.instructions') }}</label>
          <textarea
            id="instructions"
            v-model="form.instructions"
            name="instructions"
            :placeholder="$t('paymentMethods.instructionsPlaceholder')"
            rows="3"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button
          v-if="canManage"
          type="submit"
          class="btn btn-primary"
          :disabled="saving"
          data-testid="save-payment-method"
        >
          {{ saving ? $t('common.saving') : $t('common.save') }}
        </button>
        <router-link
          to="/admin/payment-methods"
          class="btn btn-secondary"
          data-testid="cancel-btn"
        >
          {{ $t('common.cancel') }}
        </router-link>
      </div>

      <div
        v-if="error"
        class="error-message"
      >
        {{ error }}
      </div>

      <div
        v-if="successMessage"
        class="success-message"
      >
        {{ successMessage }}
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePaymentMethodsStore, type CreatePaymentMethodData, type UpdatePaymentMethodData } from '@/stores/paymentMethods';
import { useAuthStore } from '@/stores/auth';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = usePaymentMethodsStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('settings.manage'));

const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const errors = ref<Record<string, string>>({});

const isEdit = computed(() => !!route.params.id);
const methodId = computed(() => route.params.id as string);

interface FormData {
  code: string;
  name: string;
  description: string;
  short_description: string;
  icon: string;
  plugin_id: string;
  is_active: boolean;
  position: number;
  min_amount: number | null;
  max_amount: number | null;
  currencies: string[];
  countries: string[];
  fee_type: 'none' | 'fixed' | 'percentage';
  fee_amount: number | null;
  fee_charged_to: 'customer' | 'merchant';
  instructions: string;
}

const form = ref<FormData>({
  code: '',
  name: '',
  description: '',
  short_description: '',
  icon: '',
  plugin_id: '',
  is_active: true,
  position: 0,
  min_amount: null,
  max_amount: null,
  currencies: [],
  countries: [],
  fee_type: 'none',
  fee_amount: null,
  fee_charged_to: 'customer',
  instructions: '',
});

// Helper for comma-separated input
const currenciesInput = ref('');
const countriesInput = ref('');

watch(currenciesInput, (val) => {
  form.value.currencies = val
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0);
});

watch(countriesInput, (val) => {
  form.value.countries = val
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0);
});

async function loadPaymentMethod(): Promise<void> {
  if (!isEdit.value) return;

  loading.value = true;
  error.value = null;

  try {
    const method = await store.fetchPaymentMethod(methodId.value);
    form.value = {
      code: method.code,
      name: method.name,
      description: method.description || '',
      short_description: method.short_description || '',
      icon: method.icon || '',
      plugin_id: method.plugin_id || '',
      is_active: method.is_active,
      position: method.position,
      min_amount: method.min_amount ? parseFloat(method.min_amount) : null,
      max_amount: method.max_amount ? parseFloat(method.max_amount) : null,
      currencies: method.currencies || [],
      countries: method.countries || [],
      fee_type: method.fee_type,
      fee_amount: method.fee_amount ? parseFloat(method.fee_amount) : null,
      fee_charged_to: method.fee_charged_to,
      instructions: method.instructions || '',
    };
    currenciesInput.value = form.value.currencies.join(', ');
    countriesInput.value = form.value.countries.join(', ');
  } catch (e) {
    error.value = (e as Error).message || t('paymentMethods.loadError');
  } finally {
    loading.value = false;
  }
}

function validate(): boolean {
  errors.value = {};

  if (!form.value.code.trim()) {
    errors.value.code = t('paymentMethods.codeRequired');
  }

  if (!form.value.name.trim()) {
    errors.value.name = t('paymentMethods.nameRequired');
  }

  return Object.keys(errors.value).length === 0;
}

async function handleSubmit(): Promise<void> {
  if (!validate()) {
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    if (isEdit.value) {
      const data: UpdatePaymentMethodData = {
        name: form.value.name,
        description: form.value.description || null,
        short_description: form.value.short_description || null,
        icon: form.value.icon || null,
        plugin_id: form.value.plugin_id || null,
        is_active: form.value.is_active,
        position: form.value.position,
        min_amount: form.value.min_amount,
        max_amount: form.value.max_amount,
        currencies: form.value.currencies,
        countries: form.value.countries,
        fee_type: form.value.fee_type,
        fee_amount: form.value.fee_type !== 'none' ? form.value.fee_amount : null,
        fee_charged_to: form.value.fee_charged_to,
        instructions: form.value.instructions || null,
      };

      await store.updatePaymentMethod(methodId.value, data);
      successMessage.value = t('paymentMethods.methodUpdated');
    } else {
      const data: CreatePaymentMethodData = {
        code: form.value.code,
        name: form.value.name,
        description: form.value.description || undefined,
        short_description: form.value.short_description || undefined,
        icon: form.value.icon || undefined,
        plugin_id: form.value.plugin_id || undefined,
        is_active: form.value.is_active,
        position: form.value.position,
        min_amount: form.value.min_amount,
        max_amount: form.value.max_amount,
        currencies: form.value.currencies,
        countries: form.value.countries,
        fee_type: form.value.fee_type,
        fee_amount: form.value.fee_type !== 'none' ? form.value.fee_amount : null,
        fee_charged_to: form.value.fee_charged_to,
        instructions: form.value.instructions || undefined,
      };

      await store.createPaymentMethod(data);
      successMessage.value = t('paymentMethods.methodCreated');
    }

    // Redirect after short delay to show success message
    setTimeout(() => {
      router.push('/admin/payment-methods');
    }, 1500);
  } catch (e) {
    error.value = (e as Error).message || t('paymentMethods.saveError');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadPaymentMethod();
});
</script>

<style scoped>
.payment-method-form-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 800px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #2c3e50;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.form-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e9ecef;
}

.form-section h3 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 1.1em;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #495057;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:disabled,
.form-group input[readonly] {
  background: #e9ecef;
  cursor: not-allowed;
}

.form-group small {
  display: block;
  margin-top: 4px;
  color: #6c757d;
  font-size: 0.85em;
}

.form-group .error {
  display: block;
  margin-top: 4px;
  color: #dc3545;
  font-size: 0.85em;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  display: inline-block;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-primary:disabled {
  background: #93c5e6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.error-message {
  margin-top: 15px;
  padding: 10px;
  background: #f8d7da;
  color: #721c24;
  border-radius: 4px;
}

.success-message {
  margin-top: 15px;
  padding: 10px;
  background: #d4edda;
  color: #155724;
  border-radius: 4px;
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
