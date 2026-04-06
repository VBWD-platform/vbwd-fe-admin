<template>
  <div class="token-bundle-form-view">
    <div class="form-header">
      <button
        data-testid="back-button"
        class="back-btn"
        @click="goBack"
      >
        &larr; {{ $t('common.back') }}
      </button>
    </div>

    <h2 data-testid="form-title">
      {{ isEdit ? $t('tokenBundles.editBundle') : $t('tokenBundles.createBundle') }}
    </h2>

    <div
      v-if="loading"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>

    <div
      v-else-if="loadError"
      data-testid="load-error"
      class="error-state"
    >
      <p>{{ loadError }}</p>
      <button
        class="retry-btn"
        @click="loadBundle"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <form
      v-else
      data-testid="token-bundle-form"
      class="bundle-form"
      @submit.prevent="handleSubmit"
    >
      <div
        v-if="submitError"
        data-testid="submit-error"
        class="error-message"
      >
        {{ submitError }}
      </div>

      <div class="form-section">
        <div class="form-group">
          <label for="name">{{ $t('tokenBundles.name') }} *</label>
          <input
            id="name"
            v-model="formData.name"
            data-testid="bundle-name-input"
            type="text"
            class="form-input"
            required
            :placeholder="$t('tokenBundles.namePlaceholder')"
          >
        </div>

        <div class="form-group">
          <label for="description">{{ $t('tokenBundles.description') }}</label>
          <textarea
            id="description"
            v-model="formData.description"
            data-testid="bundle-description-input"
            class="form-textarea"
            rows="3"
            :placeholder="$t('tokenBundles.descriptionPlaceholder')"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="tokenAmount">{{ $t('tokenBundles.tokenAmount') }} *</label>
            <input
              id="tokenAmount"
              v-model.number="formData.token_amount"
              data-testid="bundle-tokens-input"
              type="number"
              min="1"
              class="form-input"
              required
              :placeholder="$t('tokenBundles.tokenAmountPlaceholder')"
            >
          </div>

          <div class="form-group">
            <label for="price">{{ $t('tokenBundles.price') }} *</label>
            <input
              id="price"
              v-model.number="formData.price"
              data-testid="bundle-price-input"
              type="number"
              step="0.01"
              min="0"
              class="form-input"
              required
              :placeholder="$t('tokenBundles.pricePlaceholder')"
            >
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="sortOrder">{{ $t('tokenBundles.sortOrder') }}</label>
            <input
              id="sortOrder"
              v-model.number="formData.sort_order"
              data-testid="bundle-sort-input"
              type="number"
              min="0"
              class="form-input"
            >
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                v-model="formData.is_active"
                data-testid="bundle-active-checkbox"
                type="checkbox"
              >
              <span>{{ $t('tokenBundles.isActive') }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="button"
          data-testid="cancel-button"
          class="cancel-btn"
          @click="goBack"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          v-if="canManage"
          type="submit"
          data-testid="bundle-save-btn"
          class="submit-btn"
          :disabled="submitting"
        >
          {{ submitting ? $t('common.saving') : (isEdit ? $t('common.saveChanges') : $t('tokenBundles.createBundle')) }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTokenBundlesStore } from '@/stores/tokenBundles';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const tokenBundlesStore = useTokenBundlesStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('settings.manage'));

const bundleId = computed(() => route.params.id as string | undefined);
const isEdit = computed(() => !!bundleId.value && bundleId.value !== 'new');

const loading = ref(false);
const loadError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const submitting = ref(false);

interface FormData {
  name: string;
  description: string;
  token_amount: number;
  price: number;
  is_active: boolean;
  sort_order: number;
}

const formData = reactive<FormData>({
  name: '',
  description: '',
  token_amount: 1000,
  price: 5,
  is_active: true,
  sort_order: 0,
});

async function loadBundle(): Promise<void> {
  if (!isEdit.value || !bundleId.value) return;

  loading.value = true;
  loadError.value = null;

  try {
    const bundle = await tokenBundlesStore.fetchBundle(bundleId.value);
    formData.name = bundle.name;
    formData.description = bundle.description || '';
    formData.token_amount = bundle.token_amount;
    formData.price = parseFloat(bundle.price);
    formData.is_active = bundle.is_active;
    formData.sort_order = bundle.sort_order;
  } catch (error) {
    loadError.value = (error as Error).message || t('tokenBundles.loadError');
  } finally {
    loading.value = false;
  }
}

async function handleSubmit(): Promise<void> {
  submitError.value = null;
  submitting.value = true;

  try {
    if (isEdit.value && bundleId.value) {
      await tokenBundlesStore.updateBundle(bundleId.value, {
        name: formData.name,
        description: formData.description || undefined,
        token_amount: formData.token_amount,
        price: formData.price,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      });
    } else {
      await tokenBundlesStore.createBundle({
        name: formData.name,
        description: formData.description || undefined,
        token_amount: formData.token_amount,
        price: formData.price,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      });
    }
    goBack();
  } catch (error) {
    submitError.value = (error as Error).message || t('tokenBundles.saveError');
  } finally {
    submitting.value = false;
  }
}

function goBack(): void {
  router.push('/admin/settings');
}

onMounted(() => {
  if (isEdit.value) {
    loadBundle();
  }
});
</script>

<style scoped>
.token-bundle-form-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 700px;
}

.form-header {
  margin-bottom: 20px;
}

.back-btn {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.back-btn:hover {
  text-decoration: underline;
}

h2 {
  margin: 0 0 25px 0;
  color: #2c3e50;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 14px;
}

.form-section {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #3498db;
  outline: none;
}

.checkbox-group {
  display: flex;
  align-items: center;
  padding-top: 28px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.cancel-btn {
  padding: 10px 20px;
  background: #e9ecef;
  color: #495057;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: #dee2e6;
}

.submit-btn {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.submit-btn:hover:not(:disabled) {
  background: #218838;
}

.submit-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}
</style>
