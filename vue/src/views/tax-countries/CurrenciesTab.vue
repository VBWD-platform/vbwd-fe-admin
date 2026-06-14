<template>
  <div
    data-testid="currencies-content"
    class="currencies-tab"
  >
    <div class="tab-toolbar">
      <p class="section-description">
        {{ $t('currencies.description') }}
      </p>
      <ImportExportControls
        v-if="showImportExport"
        data-testid="currency-import-export"
        :api="dataExchangeApi"
        entity-key="currencies"
        :can-export="currenciesCapabilities.can_export"
        :can-import="currenciesCapabilities.can_import"
        :can-export-pii="currenciesCapabilities.can_export_pii"
        :is-superadmin="isSuperAdmin"
        :supported-formats="currenciesCapabilities.supported_formats"
        @refresh="loadCurrencies"
      />
    </div>

    <div
      v-if="saveError"
      data-testid="currency-error-message"
      class="error-message"
    >
      {{ saveError }}
    </div>

    <div
      v-if="loading && currencies.length === 0"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>

    <template v-else>
      <!-- Block 1: active / available two-panel selector -->
      <div class="form-section">
        <div class="section-header">
          <h3>{{ $t('currencies.activeAvailable.title') }}</h3>
          <button
            v-if="canManage"
            class="add-btn"
            data-testid="currency-add-btn"
            @click="openAddForm"
          >
            {{ $t('currencies.addCurrency') }}
          </button>
        </div>
        <p class="section-hint">
          {{ $t('currencies.activeAvailable.hint') }}
        </p>

        <form
          v-if="showAddForm"
          class="add-form"
          data-testid="currency-new-form"
          @submit.prevent="handleCreate"
        >
          <div class="add-form-grid">
            <label class="add-field">
              <span>{{ $t('currencies.newCurrency.code') }}</span>
              <input
                v-model="newCurrency.code"
                type="text"
                maxlength="3"
                class="form-input"
                data-testid="currency-new-code"
              >
            </label>
            <label class="add-field">
              <span>{{ $t('currencies.newCurrency.name') }}</span>
              <input
                v-model="newCurrency.name"
                type="text"
                class="form-input"
                data-testid="currency-new-name"
              >
            </label>
            <label class="add-field">
              <span>{{ $t('currencies.newCurrency.symbol') }}</span>
              <input
                v-model="newCurrency.symbol"
                type="text"
                class="form-input"
                data-testid="currency-new-symbol"
              >
            </label>
            <label class="add-field">
              <span>{{ $t('currencies.newCurrency.decimals') }}</span>
              <input
                v-model="newCurrency.decimalPlaces"
                type="number"
                min="0"
                step="1"
                class="form-input"
                data-testid="currency-new-decimals"
              >
            </label>
            <label class="add-field">
              <span>{{ $t('currencies.newCurrency.rate') }}</span>
              <input
                v-model="newCurrency.exchangeRate"
                type="number"
                min="0"
                step="any"
                class="form-input"
                data-testid="currency-new-rate"
              >
            </label>
          </div>
          <p class="add-form-hint">
            {{ $t('currencies.newCurrency.duplicateHint') }}
          </p>
          <div class="add-form-actions">
            <button
              type="submit"
              class="save-btn"
              data-testid="currency-new-submit"
              @click.prevent="handleCreate"
            >
              {{ $t('currencies.newCurrency.submit') }}
            </button>
            <button
              type="button"
              class="cancel-btn"
              data-testid="currency-new-cancel"
              @click="closeAddForm"
            >
              {{ $t('currencies.newCurrency.cancel') }}
            </button>
          </div>
        </form>

        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            class="form-input"
            :placeholder="$t('common.search')"
            data-testid="currency-search"
          >
        </div>

        <div class="dual-panel">
          <div class="currency-panel">
            <div class="currency-panel-header">
              <h4>{{ $t('currencies.activeAvailable.active') }}</h4>
              <span class="count-badge enabled-badge">{{ filteredActive.length }}</span>
            </div>
            <ul
              class="currency-list"
              data-testid="currency-active-list"
            >
              <li
                v-for="currency in filteredActive"
                :key="currency.code"
                class="currency-item"
                :data-testid="`currency-active-${currency.code}`"
              >
                <span class="currency-symbol">{{ currency.symbol }}</span>
                <span class="currency-name">{{ currency.name }}</span>
                <span class="currency-code">{{ currency.code }}</span>
                <span
                  v-if="currency.is_default"
                  class="badge badge--green"
                  data-testid="currency-default-badge"
                >
                  {{ $t('currencies.default') }}
                </span>
                <button
                  v-if="canManage && !currency.is_default"
                  class="action-btn deactivate-btn"
                  :data-testid="`currency-deactivate-${currency.code}`"
                  @click="handleDeactivate(currency.code)"
                >
                  {{ $t('currencies.activeAvailable.deactivate') }}
                </button>
              </li>
            </ul>
          </div>

          <div class="currency-panel">
            <div class="currency-panel-header">
              <h4>{{ $t('currencies.activeAvailable.available') }}</h4>
              <span class="count-badge">{{ filteredAvailable.length }}</span>
            </div>
            <ul
              class="currency-list"
              data-testid="currency-available-list"
            >
              <li
                v-for="currency in filteredAvailable"
                :key="currency.code"
                class="currency-item"
                :data-testid="`currency-available-${currency.code}`"
              >
                <span class="currency-symbol">{{ currency.symbol }}</span>
                <span class="currency-name">{{ currency.name }}</span>
                <span class="currency-code">{{ currency.code }}</span>
                <button
                  v-if="canManage"
                  class="action-btn activate-btn"
                  :data-testid="`currency-activate-${currency.code}`"
                  @click="handleActivate(currency.code)"
                >
                  {{ $t('currencies.activeAvailable.activate') }}
                </button>
                <button
                  v-if="canManage"
                  class="action-btn delete-btn"
                  :data-testid="`currency-delete-${currency.code}`"
                  :title="$t('currencies.deleteConfirm')"
                  @click="handleDelete(currency.code)"
                >
                  &times;
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Block 2: default currency selector -->
      <div class="form-section">
        <div class="section-header">
          <h3>{{ $t('currencies.defaultSelector.title') }}</h3>
        </div>
        <p class="section-hint">
          {{ $t('currencies.defaultSelector.hint') }}
        </p>
        <select
          :value="defaultCode"
          class="form-input"
          data-testid="currency-default-select"
          :disabled="!canManage"
          @change="handleDefaultChange"
        >
          <option
            v-for="currency in active"
            :key="currency.code"
            :value="currency.code"
          >
            {{ currency.code }} — {{ currency.name }}
          </option>
        </select>
      </div>

      <!-- Block 3: cross-rate base switcher -->
      <div class="form-section">
        <div class="section-header">
          <h3>{{ $t('currencies.crossRateBase.title') }}</h3>
        </div>
        <p class="section-hint">
          {{ $t('currencies.crossRateBase.hint') }}
        </p>
        <select
          v-model="crossRateBase"
          class="form-input"
          data-testid="currency-base-switch"
          :disabled="!canManage"
          @change="handleBaseChange"
        >
          <option value="default">
            {{ $t('currencies.crossRateBase.optionDefault', { code: defaultCode }) }}
          </option>
          <option
            value="usd"
            :disabled="!usdActive"
          >
            {{ $t('currencies.crossRateBase.optionUsd') }}
          </option>
        </select>
      </div>

      <!-- Block 4: editable rate sheet -->
      <div class="form-section">
        <div class="section-header">
          <h3>{{ $t('currencies.rateSheet.title') }}</h3>
        </div>
        <p class="section-hint">
          {{ $t('currencies.rateSheet.hint') }}
        </p>
        <table
          v-if="rateRows.length > 0"
          class="data-table"
          data-testid="currency-rate-table"
        >
          <thead>
            <tr>
              <th>{{ $t('currencies.rateSheet.pair') }}</th>
              <th>{{ $t('currencies.rateSheet.rate') }}</th>
              <th>{{ $t('currencies.rateSheet.inverse') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rateRows"
              :key="row.rowKey"
              :data-testid="`currency-rate-row-${row.rowKey}`"
            >
              <td>
                <code>{{ row.pair }}</code>
              </td>
              <td>
                <input
                  v-model="editedValues[row.rowKey]"
                  type="number"
                  step="any"
                  min="0"
                  class="form-input rate-input"
                  :data-testid="`currency-rate-${row.rowKey}`"
                >
              </td>
              <td
                class="inverse-cell"
                :data-testid="`currency-rate-inverse-${row.rowKey}`"
              >
                {{ formatDisplay(inverseOf(editedValues[row.rowKey])) }}
              </td>
            </tr>
          </tbody>
        </table>
        <p
          v-else
          class="empty-state"
        >
          {{ $t('currencies.rateSheet.empty') }}
        </p>
        <div
          v-if="rateRows.length > 0 && canManage"
          class="rate-actions"
        >
          <button
            class="save-btn"
            data-testid="currency-rates-save-all"
            :disabled="!hasUnsavedEdits"
            @click="handleSaveAllRates"
          >
            {{ $t('currencies.saveRates') }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ImportExportControls } from 'vbwd-view-component';
import { api } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useCurrenciesStore } from '@/stores/currencies';
import type { Currency } from '@/stores/currencies';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';

type CrossRateBase = 'default' | 'usd';

interface RateRow {
  /**
   * The currency the row is *about* (left side of the pair). Used for the row
   * key / data-testid / edited-value map. For the `<default>USD` row this is the
   * default currency (e.g. EUR), even though the save targets USD.
   */
  rowKey: string;
  /** Currency whose stored exchange_rate this row writes to on save. */
  targetCode: string;
  /** Display label, e.g. "GBPEUR" or "GBPUSD". */
  pair: string;
  /** The default-relative exchange_rate the displayed value represents. */
  storedRate: number;
}

const DISPLAY_DECIMALS = 6;
const USD_CODE = 'USD';
const DEFAULT_CROSS_RATE_BASE: CrossRateBase = 'default';
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const DEFAULT_NEW_DECIMAL_PLACES = '2';
const DEFAULT_NEW_EXCHANGE_RATE = '1';

interface NewCurrencyForm {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: string;
  exchangeRate: string;
}

function emptyNewCurrencyForm(): NewCurrencyForm {
  return {
    code: '',
    name: '',
    symbol: '',
    decimalPlaces: DEFAULT_NEW_DECIMAL_PLACES,
    exchangeRate: DEFAULT_NEW_EXCHANGE_RATE,
  };
}

const { t } = useI18n();
const authStore = useAuthStore();
const currenciesStore = useCurrenciesStore();

const canManage = computed(() => authStore.hasPermission('settings.manage'));
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

const dataExchangeApi = createDataExchangeApi();
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const currenciesCapabilities = computed(() => capabilitiesFor('currencies'));
const showImportExport = computed(
  () => currenciesCapabilities.value.can_export || currenciesCapabilities.value.can_import,
);

const loading = ref(false);
const saveError = ref<string | null>(null);
const searchQuery = ref('');
const crossRateBase = ref<CrossRateBase>(DEFAULT_CROSS_RATE_BASE);
const showAddForm = ref(false);
const newCurrency = reactive<NewCurrencyForm>(emptyNewCurrencyForm());

// Editable rate-sheet values, keyed by the target currency code. Stored as
// strings (the raw <input> value) so we carry full precision and only round for
// display; the view -> store transform stays lossless to 1e-7.
const editedValues = reactive<Record<string, string>>({});

// The values as last loaded/synced, used to detect which rows changed so the
// general Save button only PUTs dirty rows and disables itself when clean.
const loadedValues = reactive<Record<string, string>>({});

const currencies = computed(() => currenciesStore.currencies);
const active = computed(() => currenciesStore.active);
const available = computed(() => currenciesStore.available);
const defaultCurrency = computed(() => currenciesStore.defaultCurrency);
const defaultCode = computed(() => defaultCurrency.value?.code ?? '');

const usdCurrency = computed(() => active.value.find((currency) => currency.code === USD_CODE) ?? null);
const usdActive = computed(() => usdCurrency.value !== null);

const filteredActive = computed(() => filterByQuery(active.value));
const filteredAvailable = computed(() => filterByQuery(available.value));

function filterByQuery(list: Currency[]): Currency[] {
  if (!searchQuery.value) {
    return list;
  }
  const query = searchQuery.value.toLowerCase();
  return list.filter(
    (currency) =>
      currency.code.toLowerCase().includes(query) || currency.name.toLowerCase().includes(query),
  );
}

/**
 * The editable rate sheet rows for the current base.
 *
 *  - base = default: one row per active non-default currency X. Pair
 *    `${X.code}${default.code}`, displayed value = X.exchange_rate.
 *  - base = USD (USD active): one row per active currency X where X != USD.
 *    Pair `${X.code}USD`, displayed value = X.exchange_rate / USD.exchange_rate.
 *    PLUS a `${default.code}USD` row (target = USD), displayed value =
 *    USD.exchange_rate.
 */
const rateRows = computed<RateRow[]>(() => {
  const rows: RateRow[] = [];
  if (crossRateBase.value === 'usd' && usdCurrency.value) {
    const usdRate = usdCurrency.value.exchange_rate;
    for (const currency of active.value) {
      if (currency.code === USD_CODE) {
        continue;
      }
      if (currency.is_default) {
        // The <default>USD row: shown as the default currency (e.g. EUR), but
        // its value IS USD.exchange_rate (USD per default), so the save targets
        // USD's stored rate.
        rows.push({
          rowKey: currency.code,
          targetCode: USD_CODE,
          pair: `${currency.code}${USD_CODE}`,
          storedRate: usdRate,
        });
      } else {
        rows.push({
          rowKey: currency.code,
          targetCode: currency.code,
          pair: `${currency.code}${USD_CODE}`,
          storedRate: currency.exchange_rate,
        });
      }
    }
    return rows;
  }

  // base = default
  for (const currency of active.value) {
    if (currency.is_default) {
      continue;
    }
    rows.push({
      rowKey: currency.code,
      targetCode: currency.code,
      pair: `${currency.code}${defaultCode.value}`,
      storedRate: currency.exchange_rate,
    });
  }
  return rows;
});

/** The number actually shown/edited in the input for a row, given the base. */
function displayedValueFor(row: RateRow): number {
  if (crossRateBase.value === 'usd' && usdCurrency.value) {
    if (row.targetCode === USD_CODE) {
      // <default>USD row: shows USD per default = USD.exchange_rate.
      return usdCurrency.value.exchange_rate;
    }
    // X per USD = X.exchange_rate / USD.exchange_rate.
    return row.storedRate / usdCurrency.value.exchange_rate;
  }
  // base = default: X per default = X.exchange_rate.
  return row.storedRate;
}

/** Convert an edited displayed value back to the default-relative stored rate. */
function toStoredRate(row: RateRow, displayedValue: number): number {
  if (crossRateBase.value === 'usd' && usdCurrency.value) {
    if (row.targetCode === USD_CODE) {
      // Editing <default>USD sets USD.exchange_rate directly.
      return displayedValue;
    }
    return displayedValue * usdCurrency.value.exchange_rate;
  }
  return displayedValue;
}

function syncEditedValues(): void {
  const next: Record<string, string> = {};
  for (const row of rateRows.value) {
    next[row.rowKey] = String(displayedValueFor(row));
  }
  // Replace contents (keep the same reactive object).
  for (const key of Object.keys(editedValues)) {
    delete editedValues[key];
  }
  for (const key of Object.keys(loadedValues)) {
    delete loadedValues[key];
  }
  Object.assign(editedValues, next);
  Object.assign(loadedValues, next);
}

/** The rows whose input value differs from the last loaded/synced value. */
const changedRows = computed<RateRow[]>(() =>
  rateRows.value.filter((row) => editedValues[row.rowKey] !== loadedValues[row.rowKey]),
);

const hasUnsavedEdits = computed(() => changedRows.value.length > 0);

function inverseOf(rawValue: string | undefined): number {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return 1 / value;
}

function formatDisplay(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  return value.toFixed(DISPLAY_DECIMALS);
}

async function loadCurrencies(): Promise<void> {
  loading.value = true;
  saveError.value = null;
  try {
    await currenciesStore.fetchCurrencies();
    syncEditedValues();
  } catch (error) {
    saveError.value = (error as Error).message || t('currencies.loadError');
  } finally {
    loading.value = false;
  }
}

async function loadCrossRateBase(): Promise<void> {
  try {
    const response = (await api.get('/admin/settings')) as { settings?: Record<string, unknown> };
    const stored = response.settings?.cross_rate_base;
    crossRateBase.value = stored === 'usd' ? 'usd' : DEFAULT_CROSS_RATE_BASE;
  } catch (error) {
    saveError.value = (error as Error).message;
  }
}

async function handleActivate(code: string): Promise<void> {
  saveError.value = null;
  try {
    await currenciesStore.activate(code);
    syncEditedValues();
  } catch (error) {
    saveError.value = (error as Error).message;
  }
}

async function handleDeactivate(code: string): Promise<void> {
  saveError.value = null;
  try {
    await currenciesStore.deactivate(code);
    syncEditedValues();
  } catch (error) {
    saveError.value = (error as Error).message;
  }
}

function openAddForm(): void {
  Object.assign(newCurrency, emptyNewCurrencyForm());
  saveError.value = null;
  showAddForm.value = true;
}

function closeAddForm(): void {
  showAddForm.value = false;
}

async function handleCreate(): Promise<void> {
  saveError.value = null;
  const code = newCurrency.code.trim().toUpperCase();
  const name = newCurrency.name.trim();
  const symbol = newCurrency.symbol.trim();
  const exchangeRate = Number(newCurrency.exchangeRate);
  const decimalPlaces = Number(newCurrency.decimalPlaces);

  if (!CURRENCY_CODE_PATTERN.test(code)) {
    saveError.value = t('currencies.newCurrency.codeFormat');
    return;
  }
  if (!name || !symbol) {
    saveError.value = t('currencies.newCurrency.missingFields');
    return;
  }
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    saveError.value = t('currencies.newCurrency.invalidRate');
    return;
  }

  try {
    await currenciesStore.createCurrency({
      code,
      name,
      symbol,
      decimal_places: Number.isFinite(decimalPlaces) ? decimalPlaces : undefined,
      exchange_rate: exchangeRate,
    });
    syncEditedValues();
    showAddForm.value = false;
  } catch (error) {
    saveError.value = (error as Error).message;
  }
}

async function handleDelete(code: string): Promise<void> {
  if (!confirm(t('currencies.deleteConfirm', { code }))) {
    return;
  }
  saveError.value = null;
  try {
    await currenciesStore.deleteCurrency(code);
    syncEditedValues();
  } catch (error) {
    saveError.value = (error as Error).message || t('currencies.deleteFailed');
  }
}

async function handleDefaultChange(event: Event): Promise<void> {
  const code = (event.target as HTMLSelectElement).value;
  if (code === defaultCode.value) {
    return;
  }
  if (!confirm(t('currencies.defaultSelector.confirm'))) {
    // Revert the visual selection — the bound :value will re-render on re-fetch.
    (event.target as HTMLSelectElement).value = defaultCode.value;
    return;
  }
  saveError.value = null;
  try {
    await currenciesStore.setDefault(code);
    await currenciesStore.fetchCurrencies();
    syncEditedValues();
  } catch (error) {
    saveError.value = (error as Error).message;
  }
}

async function handleBaseChange(): Promise<void> {
  saveError.value = null;
  try {
    await api.put('/admin/settings', { cross_rate_base: crossRateBase.value });
    syncEditedValues();
  } catch (error) {
    saveError.value = (error as Error).message;
  }
}

async function handleSaveAllRates(): Promise<void> {
  saveError.value = null;
  const rowsToSave = changedRows.value;
  if (rowsToSave.length === 0) {
    return;
  }
  for (const row of rowsToSave) {
    const displayedValue = Number(editedValues[row.rowKey]);
    if (!Number.isFinite(displayedValue) || displayedValue <= 0) {
      saveError.value = t('currencies.rateSheet.invalidRate');
      return;
    }
  }
  const failedRows: string[] = [];
  for (const row of rowsToSave) {
    const storedRate = toStoredRate(row, Number(editedValues[row.rowKey]));
    try {
      await currenciesStore.updateRate(row.targetCode, storedRate);
    } catch {
      failedRows.push(row.pair);
    }
  }
  await currenciesStore.fetchCurrencies();
  syncEditedValues();
  if (failedRows.length > 0) {
    saveError.value = t('currencies.rateSheet.saveFailed', { pairs: failedRows.join(', ') });
  }
}

// Re-derive the editable inputs whenever the base or catalog changes.
watch([crossRateBase, currencies], () => {
  syncEditedValues();
});

onMounted(() => {
  loadCurrencies();
  loadCrossRateBase();
  loadManifest();
});
</script>

<style scoped>
.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.section-description {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1rem;
}

.section-hint {
  color: #666;
  font-size: 0.85rem;
  margin: 0 0 15px 0;
}

.search-box {
  margin-bottom: 15px;
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

.dual-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .dual-panel {
    grid-template-columns: 1fr;
  }
}

.currency-panel {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.currency-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.currency-panel-header h4 {
  margin: 0;
  font-size: 15px;
  color: #495057;
}

.count-badge {
  background: #6c757d;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.enabled-badge {
  background: #28a745;
}

.currency-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 360px;
  overflow-y: auto;
}

.currency-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
}

.currency-item:last-child {
  border-bottom: none;
}

.currency-symbol {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.currency-name {
  flex: 1;
  color: #212529;
}

.currency-code {
  color: #6c757d;
  font-family: monospace;
  font-size: 12px;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
}

.badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge--green {
  background: #d4edda;
  color: #155724;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.action-btn.activate-btn {
  background: #e8f5e9;
  color: #388e3c;
}

.action-btn.deactivate-btn {
  background: #fff3e0;
  color: #f57c00;
}

.action-btn.delete-btn {
  background: #fdecea;
  color: #c0392b;
  font-size: 16px;
  line-height: 1;
  padding: 4px 10px;
}

.add-btn {
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.add-btn:hover {
  background: #2c80b4;
}

.add-form {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 15px;
  background: #f8f9fa;
}

.add-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.add-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: #495057;
}

.add-form-hint {
  color: #666;
  font-size: 0.8rem;
  margin: 10px 0 0 0;
}

.add-form-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.cancel-btn {
  padding: 12px 30px;
  background: #e9ecef;
  color: #495057;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: #dde1e5;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
}

.data-table code {
  background: #e9ecef;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 13px;
}

.rate-input {
  max-width: 200px;
}

.inverse-cell {
  font-family: monospace;
  color: #6c757d;
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
  background: #a9d4b6;
  cursor: not-allowed;
}

.rate-actions {
  margin-top: 15px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
  background: #f8f9fa;
  border-radius: 8px;
}
</style>
