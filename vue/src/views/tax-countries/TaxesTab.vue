<template>
  <div
    data-testid="tax-content"
    class="tax-tab"
  >
    <div
      v-if="successMessage"
      data-testid="tax-success-message"
      class="success-message"
    >
      {{ successMessage }}
    </div>

    <div
      v-if="saveError"
      data-testid="tax-error-message"
      class="error-message"
    >
      {{ saveError }}
    </div>

    <!-- Global price display mode (S72.4) -->
    <div
      class="form-section"
      data-testid="prices-display-mode-section"
    >
      <div class="section-header">
        <h3>{{ $t('settings.tax.priceDisplay.label') }}</h3>
      </div>
      <p class="section-hint">
        {{ $t('settings.tax.priceDisplay.hint') }}
      </p>
      <div class="form-row">
        <div class="form-group">
          <select
            v-model="pricesDisplayMode"
            class="form-input"
            data-testid="prices-display-mode-select"
          >
            <option value="brutto">
              {{ $t('settings.tax.priceDisplay.brutto') }}
            </option>
            <option value="netto">
              {{ $t('settings.tax.priceDisplay.netto') }}
            </option>
          </select>
        </div>
        <div class="form-group form-group--inline-action">
          <button
            v-if="canManage"
            class="save-btn"
            :disabled="savingPricesDisplayMode"
            data-testid="save-prices-display-mode-btn"
            @click="handleSavePricesDisplayMode"
          >
            {{ $t('settings.tax.priceDisplay.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tax Rates Section -->
    <div class="form-section">
      <div class="section-header">
        <h3>{{ $t('settings.tax.ratesTitle') }}</h3>
        <div class="section-actions">
          <ImportExportControls
            v-if="showTaxesImportExport"
            :api="dataExchangeApi"
            entity-key="taxes"
            :can-export="taxesCapabilities.can_export"
            :can-import="taxesCapabilities.can_import"
            :can-export-pii="taxesCapabilities.can_export_pii"
            :is-superadmin="isSuperAdmin"
            :supported-formats="taxesCapabilities.supported_formats"
            @refresh="loadTaxData"
          />
          <button
            v-if="canManage"
            class="create-btn"
            data-testid="add-tax-rate-btn"
            @click="openCreateTaxRate"
          >
            {{ $t('settings.tax.addRate') }}
          </button>
        </div>
      </div>

      <!-- Tax Rate Form -->
      <div
        v-if="showTaxRateForm"
        class="inline-form"
        data-testid="tax-rate-form"
      >
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t('settings.tax.rateName') }}</label>
            <input
              v-model="taxRateForm.name"
              type="text"
              class="form-input"
              data-testid="tax-rate-name-input"
              :placeholder="$t('settings.tax.rateNamePlaceholder')"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('settings.tax.rateCode') }}</label>
            <input
              v-model="taxRateForm.code"
              type="text"
              class="form-input"
              data-testid="tax-rate-code-input"
              :placeholder="$t('settings.tax.rateCodePlaceholder')"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('settings.tax.ratePercent') }}</label>
            <input
              v-model="taxRateForm.rate"
              type="number"
              step="0.01"
              class="form-input"
              data-testid="tax-rate-rate-input"
            >
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t('settings.tax.country') }}</label>
            <input
              v-model="taxRateForm.country_code"
              type="text"
              maxlength="2"
              class="form-input"
              data-testid="tax-rate-country-input"
              :placeholder="$t('settings.tax.countryPlaceholder')"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('settings.tax.region') }}</label>
            <input
              v-model="taxRateForm.region_code"
              type="text"
              class="form-input"
              data-testid="tax-rate-region-input"
              :placeholder="$t('settings.tax.regionPlaceholder')"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('settings.tax.taxClass') }}</label>
            <input
              v-model="taxRateForm.tax_class"
              type="text"
              class="form-input"
              list="tax-class-suggestions"
              data-testid="tax-rate-class-input"
              :placeholder="$t('settings.tax.taxClassPlaceholder')"
            >
            <datalist id="tax-class-suggestions">
              <option value="standard" />
              <option value="reduced" />
              <option value="zero" />
            </datalist>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group form-group--checkbox">
            <label>
              <input
                v-model="taxRateForm.is_active"
                type="checkbox"
                data-testid="tax-rate-active-input"
              >
              {{ $t('common.active') }}
            </label>
          </div>
          <div class="form-group form-group--checkbox">
            <label>
              <input
                v-model="taxRateForm.is_inclusive"
                type="checkbox"
                data-testid="tax-rate-inclusive-input"
              >
              {{ $t('settings.tax.inclusive') }}
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>{{ $t('common.description') }}</label>
          <input
            v-model="taxRateForm.description"
            type="text"
            class="form-input"
          >
        </div>
        <div class="form-actions-inline">
          <button
            class="save-btn"
            data-testid="save-tax-rate-btn"
            :disabled="taxLoading"
            @click="handleSaveTaxRate"
          >
            {{ editingTaxRate ? $t('common.save') : $t('common.create') }}
          </button>
          <button
            class="cancel-btn"
            @click="showTaxRateForm = false"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </div>

      <!-- Bulk toolbar (rates) -->
      <div
        v-if="selectedRateIds.size > 0"
        class="bulk-toolbar"
        data-testid="rates-bulk-toolbar"
      >
        <span
          class="bulk-count"
          data-testid="rates-bulk-selected-count"
        >
          {{ $t('settings.tax.bulkDelete.selectedCount', { count: selectedRateIds.size }) }}
        </span>
        <button
          v-if="canManage"
          class="btn btn--sm btn--danger"
          data-testid="rates-bulk-delete-btn"
          @click="handleBulkDeleteRates"
        >
          {{ $t('settings.tax.bulkDelete.deleteSelected') }}
        </button>
      </div>

      <!-- Tax Rates Table -->
      <table
        v-if="taxRates.length > 0"
        class="data-table"
        data-testid="tax-rates-table"
      >
        <thead>
          <tr>
            <th
              v-if="canManage"
              class="checkbox-col"
            >
              <input
                type="checkbox"
                :checked="allRatesSelected"
                data-testid="select-all-rates"
                @change="toggleAllRates"
              >
            </th>
            <th>{{ $t('settings.tax.rateName') }}</th>
            <th>{{ $t('settings.tax.rateCode') }}</th>
            <th>{{ $t('settings.tax.country') }}</th>
            <th>{{ $t('settings.tax.region') }}</th>
            <th>{{ $t('settings.tax.ratePercent') }}</th>
            <th>{{ $t('settings.tax.taxClass') }}</th>
            <th>{{ $t('common.status') }}</th>
            <th>{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="rate in taxRates"
            :key="rate.id"
          >
            <td
              v-if="canManage"
              class="checkbox-col"
            >
              <input
                type="checkbox"
                :checked="selectedRateIds.has(rate.id)"
                :data-testid="`select-rate-${rate.id}`"
                @change="toggleSelectRate(rate.id)"
              >
            </td>
            <td>{{ rate.name }}</td>
            <td><code>{{ rate.code }}</code></td>
            <td>{{ rate.country_code || '—' }}</td>
            <td>{{ rate.region_code || '—' }}</td>
            <td>{{ rate.rate }}%</td>
            <td>{{ rate.tax_class || '—' }}</td>
            <td>
              <span
                class="badge"
                :class="rate.is_active ? 'badge--green' : 'badge--gray'"
              >
                {{ rate.is_active ? $t('common.active') : $t('common.inactive') }}
              </span>
            </td>
            <td>
              <button
                v-if="canManage"
                class="btn btn--sm"
                @click="handleEditTaxRate(rate)"
              >
                {{ $t('common.edit') }}
              </button>
              <button
                v-if="canManage"
                class="btn btn--sm btn--danger"
                @click="handleDeleteTaxRate(rate.id)"
              >
                {{ $t('common.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-else-if="!taxLoading"
        class="empty-state"
      >
        {{ $t('settings.tax.noRates') }}
      </p>
    </div>

    <div
      v-if="taxLoading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ImportExportControls } from 'vbwd-view-component';
import { api } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useTaxAdminStore } from '@/stores/taxAdmin';
import type { TaxRate } from '@/stores/taxAdmin';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';

const { t } = useI18n();
const authStore = useAuthStore();
const taxAdminStore = useTaxAdminStore();

const canManage = computed(() => authStore.hasPermission('settings.manage'));
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

// Import/Export (S72.2): the Tax rates (`taxes`) section embeds the shared
// data-exchange controls, gated by the same manifest the Import/Export page
// consumes. (Tax classes were flattened into a `tax_class` string on each
// rate, so the `tax_classes` entity no longer exists.)
const dataExchangeApi = createDataExchangeApi();
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const taxesCapabilities = computed(() => capabilitiesFor('taxes'));
const showTaxesImportExport = computed(
  () => taxesCapabilities.value.can_export || taxesCapabilities.value.can_import,
);

const taxLoading = ref(false);
const saveError = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Global price display mode (S72.4): the core `prices_display_mode` setting,
// round-tripped through the existing GET|PUT /admin/settings endpoint.
const DEFAULT_PRICES_DISPLAY_MODE = 'brutto';
const pricesDisplayMode = ref<string>(DEFAULT_PRICES_DISPLAY_MODE);
const savingPricesDisplayMode = ref(false);
const showTaxRateForm = ref(false);
const editingTaxRate = ref<TaxRate | null>(null);

const taxRates = computed(() => taxAdminStore.rates);

// Bulk select + bulk delete (mirrors the house pattern in
// plugins/shop-admin/src/views/Products.vue): a `selectedIds` Set per table,
// a per-row checkbox + select-all, and a Delete-selected action that loops the
// existing single-delete endpoints. A rate that is IN USE returns 409 (S72.3):
// we do not abort the batch — delete what we can and surface which could not.
const HTTP_CONFLICT = 409;
const selectedRateIds = reactive(new Set<string>());

const allRatesSelected = computed(
  () => taxRates.value.length > 0 && taxRates.value.every(rate => selectedRateIds.has(rate.id)),
);

function toggleSelectRate(rateId: string): void {
  if (selectedRateIds.has(rateId)) {
    selectedRateIds.delete(rateId);
  } else {
    selectedRateIds.add(rateId);
  }
}

function toggleAllRates(): void {
  if (allRatesSelected.value) {
    selectedRateIds.clear();
  } else {
    taxRates.value.forEach(rate => selectedRateIds.add(rate.id));
  }
}

interface TaxRateFormData {
  name: string;
  code: string;
  rate: string;
  country_code: string;
  region_code: string;
  tax_class: string;
  is_active: boolean;
  is_inclusive: boolean;
  description: string;
}

const taxRateForm = reactive<TaxRateFormData>({
  name: '',
  code: '',
  rate: '0',
  country_code: '',
  region_code: '',
  tax_class: '',
  is_active: true,
  is_inclusive: false,
  description: '',
});

async function loadTaxData(): Promise<void> {
  taxLoading.value = true;
  try {
    await taxAdminStore.fetchRates();
  } catch (error) {
    saveError.value = (error as Error).message || 'Failed to load tax data';
  } finally {
    taxLoading.value = false;
  }
}

function openCreateTaxRate(): void {
  showTaxRateForm.value = true;
  editingTaxRate.value = null;
  Object.assign(taxRateForm, { name: '', code: '', rate: '0', country_code: '', region_code: '', tax_class: '', is_active: true, is_inclusive: false, description: '' });
}

function handleEditTaxRate(rate: TaxRate): void {
  editingTaxRate.value = rate;
  taxRateForm.name = rate.name;
  taxRateForm.code = rate.code;
  taxRateForm.rate = rate.rate;
  taxRateForm.country_code = rate.country_code || '';
  taxRateForm.region_code = rate.region_code || '';
  taxRateForm.tax_class = rate.tax_class || '';
  taxRateForm.is_active = rate.is_active;
  taxRateForm.is_inclusive = rate.is_inclusive;
  taxRateForm.description = rate.description || '';
  showTaxRateForm.value = true;
}

async function handleSaveTaxRate(): Promise<void> {
  if (!taxRateForm.name || !taxRateForm.code) return;
  try {
    const payload = {
      name: taxRateForm.name,
      code: taxRateForm.code,
      rate: taxRateForm.rate,
      country_code: taxRateForm.country_code || null,
      region_code: taxRateForm.region_code || null,
      tax_class: taxRateForm.tax_class || null,
      is_active: taxRateForm.is_active,
      is_inclusive: taxRateForm.is_inclusive,
      description: taxRateForm.description,
    };
    if (editingTaxRate.value) {
      await taxAdminStore.updateRate(editingTaxRate.value.id, payload as Partial<TaxRate>);
    } else {
      await taxAdminStore.createRate(payload as Partial<TaxRate>);
    }
    showTaxRateForm.value = false;
    successMessage.value = t('settings.tax.rateSaved');
    setTimeout(() => { successMessage.value = null; }, 3000);
  } catch (error) {
    saveError.value = (error as Error).message;
  }
}

async function handleDeleteTaxRate(rateId: string): Promise<void> {
  if (!confirm(t('settings.tax.confirmDeleteRate'))) return;
  try {
    await taxAdminStore.deleteRate(rateId);
  } catch (error) {
    saveError.value = (error as Error).message;
  }
}

function isConflictError(error: unknown): boolean {
  return (error as { status?: number }).status === HTTP_CONFLICT;
}

async function handleBulkDeleteRates(): Promise<void> {
  const rateIds = Array.from(selectedRateIds);
  if (rateIds.length === 0) return;
  if (!confirm(t('settings.tax.bulkDelete.confirmRates', { count: rateIds.length }))) return;
  saveError.value = null;

  const inUseNames: string[] = [];
  for (const rateId of rateIds) {
    try {
      await api.delete(`/admin/tax/rates/${rateId}`);
    } catch (error) {
      if (isConflictError(error)) {
        const rate = taxRates.value.find(candidate => candidate.id === rateId);
        inUseNames.push(rate ? rate.name : rateId);
      } else {
        saveError.value = (error as Error).message;
      }
    }
  }

  selectedRateIds.clear();
  await taxAdminStore.fetchRates();

  if (inUseNames.length > 0) {
    saveError.value = t('settings.tax.bulkDelete.someInUse', { names: inUseNames.join(', ') });
  }
}

async function loadPricesDisplayMode(): Promise<void> {
  try {
    const response = await api.get('/admin/settings') as { settings?: Record<string, unknown> };
    const mode = response.settings?.prices_display_mode;
    pricesDisplayMode.value = mode === 'netto' ? 'netto' : DEFAULT_PRICES_DISPLAY_MODE;
  } catch (error) {
    saveError.value = (error as Error).message || 'Failed to load price display mode';
  }
}

async function handleSavePricesDisplayMode(): Promise<void> {
  savingPricesDisplayMode.value = true;
  try {
    await api.put('/admin/settings', { prices_display_mode: pricesDisplayMode.value });
    successMessage.value = t('settings.tax.priceDisplay.saved');
    setTimeout(() => { successMessage.value = null; }, 3000);
  } catch (error) {
    saveError.value = (error as Error).message;
  } finally {
    savingPricesDisplayMode.value = false;
  }
}

onMounted(() => {
  loadTaxData();
  loadManifest();
  loadPricesDisplayMode();
});
</script>

<style scoped>
.success-message {
  background: #d4edda;
  color: #155724;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.loading-state {
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

.form-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.form-section h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 1rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
}

.create-btn {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.create-btn:hover {
  background: #218838;
}

.save-btn {
  padding: 12px 30px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.save-btn:hover:not(:disabled) {
  background: #218838;
}

.save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
  background: #f8f9fa;
  border-radius: 8px;
}

/* Tax Tab */
.tax-tab .form-section {
  margin-bottom: 30px;
}

.tax-tab .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.tax-tab .section-header h3 {
  margin: 0;
}

.tax-tab .section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.tax-tab .bulk-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  background: #eef2ff;
  border-radius: 6px;
  margin: 10px 0;
}

.tax-tab .bulk-count {
  font-size: 14px;
  font-weight: 600;
  color: #4338ca;
}

.tax-tab .checkbox-col {
  width: 40px;
  text-align: center;
}

.tax-tab .data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.tax-tab .data-table th,
.tax-tab .data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.tax-tab .data-table th {
  background: #f8f9fa;
  font-weight: 600;
}

.tax-tab .badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.tax-tab .badge--green {
  background: #d4edda;
  color: #155724;
}

.tax-tab .badge--gray {
  background: #e9ecef;
  color: #6c757d;
}

.tax-tab .btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  background: white;
}

.tax-tab .btn--sm {
  padding: 4px 8px;
  font-size: 12px;
  margin-right: 4px;
}

.tax-tab .btn--danger {
  color: #dc3545;
  border-color: #dc3545;
}

.tax-tab .btn--danger:hover {
  background: #dc3545;
  color: white;
}

.tax-tab .inline-form {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.tax-tab .inline-form .form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.tax-tab .form-group--checkbox {
  display: flex;
  align-items: center;
}

.tax-tab .form-group--checkbox label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.tax-tab .form-actions-inline {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.tax-tab .cancel-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  background: white;
}

.tax-tab code {
  background: #e9ecef;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 13px;
}
</style>
