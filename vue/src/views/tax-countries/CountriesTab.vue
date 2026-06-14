<template>
  <div
    data-testid="countries-content"
    class="countries-tab"
  >
    <div class="tab-toolbar">
      <p class="section-description">
        {{ $t('countriesConfig.description') }}
      </p>
      <ImportExportControls
        v-if="showCountriesImportExport"
        :api="dataExchangeApi"
        entity-key="countries"
        :can-export="countriesCapabilities.can_export"
        :can-import="countriesCapabilities.can_import"
        :can-export-pii="countriesCapabilities.can_export_pii"
        :is-superadmin="isSuperAdmin"
        :supported-formats="countriesCapabilities.supported_formats"
        @refresh="loadCountries"
      />
    </div>

    <div
      v-if="countriesLoading && !countriesHasData"
      class="bundles-loading"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>

    <div
      v-else-if="countriesError"
      class="bundles-error"
    >
      <p>{{ countriesError }}</p>
      <button
        class="retry-btn"
        @click="loadCountries"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <div
      v-else
      class="countries-layout"
    >
      <!-- Enabled Countries (Drag & Drop) -->
      <div class="countries-panel enabled-panel">
        <div class="countries-panel-header">
          <h3>{{ $t('countriesConfig.enabledCountries') }}</h3>
          <span class="count-badge enabled-badge">{{ enabledCountries.length }}</span>
        </div>

        <div
          v-if="enabledCountries.length === 0"
          class="empty-panel"
        >
          {{ $t('countriesConfig.noEnabledCountries') }}
        </div>

        <ul
          v-else
          class="country-list sortable-list"
          data-testid="enabled-countries-list"
          @dragover.prevent
          @drop="handleDrop"
        >
          <li
            v-for="(country, index) in enabledCountries"
            :key="country.code"
            class="country-item enabled-item"
            :data-testid="`enabled-country-${country.code}`"
            draggable="true"
            :class="{ 'drag-over': dragOverIndex === index }"
            @dragstart="handleDragStart($event, index)"
            @dragenter="handleDragEnter($event, index)"
            @dragleave="handleDragLeave"
            @dragend="handleDragEnd"
          >
            <span class="drag-handle">&#x2630;</span>
            <span class="country-flag">{{ getFlagEmoji(country.code) }}</span>
            <span class="country-name">{{ country.name }}</span>
            <span class="country-code">{{ country.code }}</span>
            <button
              v-if="canManage"
              class="action-btn deactivate-btn"
              :disabled="countryActionLoading === country.code"
              :title="$t('countriesConfig.disable')"
              @click="handleDisableCountry(country.code)"
            >
              {{ $t('countriesConfig.disable') }}
            </button>
          </li>
        </ul>
      </div>

      <!-- Disabled Countries -->
      <div class="countries-panel disabled-panel">
        <div class="countries-panel-header">
          <h3>{{ $t('countriesConfig.disabledCountries') }}</h3>
          <span class="count-badge">{{ disabledCountries.length }}</span>
        </div>

        <div class="search-box">
          <input
            v-model="countrySearchQuery"
            type="text"
            :placeholder="$t('common.search')"
            class="search-input"
            data-testid="country-search"
          >
        </div>

        <div
          v-if="filteredDisabledCountries.length === 0"
          class="empty-panel"
        >
          {{ countrySearchQuery ? $t('common.noResults') : $t('countriesConfig.noDisabledCountries') }}
        </div>

        <ul
          v-else
          class="country-list"
          data-testid="disabled-countries-list"
        >
          <li
            v-for="country in filteredDisabledCountries"
            :key="country.code"
            class="country-item disabled-item"
            :data-testid="`disabled-country-${country.code}`"
          >
            <span class="country-flag">{{ getFlagEmoji(country.code) }}</span>
            <span class="country-name">{{ country.name }}</span>
            <span class="country-code">{{ country.code }}</span>
            <button
              v-if="canManage"
              class="action-btn activate-btn"
              :disabled="countryActionLoading === country.code"
              :title="$t('countriesConfig.enable')"
              @click="handleEnableCountry(country.code)"
            >
              {{ $t('countriesConfig.enable') }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ImportExportControls } from 'vbwd-view-component';
import { useAuthStore } from '@/stores/auth';
import { useCountriesStore } from '@/stores/countries';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';

const { t } = useI18n();
const authStore = useAuthStore();
const countriesStore = useCountriesStore();

const canManage = computed(() => authStore.hasPermission('settings.manage'));
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

// Import/Export (S72.2): embed the shared data-exchange controls on the tab,
// gated by the same manifest the Import/Export page consumes.
const dataExchangeApi = createDataExchangeApi();
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const countriesCapabilities = computed(() => capabilitiesFor('countries'));
const showCountriesImportExport = computed(
  () => countriesCapabilities.value.can_export || countriesCapabilities.value.can_import,
);

const countriesLoading = ref(false);
const countriesError = ref<string | null>(null);
const countryActionLoading = ref<string | null>(null);
const countrySearchQuery = ref('');
const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const enabledCountries = computed(() => countriesStore.sortedEnabled);
const disabledCountries = computed(() => countriesStore.sortedDisabled);
const countriesHasData = computed(() => countriesStore.countries.length > 0);

const filteredDisabledCountries = computed(() => {
  if (!countrySearchQuery.value) {
    return disabledCountries.value;
  }
  const query = countrySearchQuery.value.toLowerCase();
  return disabledCountries.value.filter(
    c => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
  );
});

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

async function loadCountries(): Promise<void> {
  countriesLoading.value = true;
  countriesError.value = null;
  try {
    await countriesStore.fetchAllCountries();
  } catch (e) {
    countriesError.value = (e as Error).message || t('countriesConfig.loadError');
  } finally {
    countriesLoading.value = false;
  }
}

async function handleEnableCountry(code: string): Promise<void> {
  countryActionLoading.value = code;
  try {
    await countriesStore.enableCountry(code);
  } catch (e) {
    countriesError.value = (e as Error).message;
  } finally {
    countryActionLoading.value = null;
  }
}

async function handleDisableCountry(code: string): Promise<void> {
  countryActionLoading.value = code;
  try {
    await countriesStore.disableCountry(code);
  } catch (e) {
    countriesError.value = (e as Error).message;
  } finally {
    countryActionLoading.value = null;
  }
}

function handleDragStart(event: DragEvent, index: number): void {
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
}

function handleDragEnter(_event: DragEvent, index: number): void {
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    dragOverIndex.value = index;
  }
}

function handleDragLeave(): void {
  dragOverIndex.value = null;
}

function handleDragEnd(): void {
  draggedIndex.value = null;
  dragOverIndex.value = null;
}

async function handleDrop(): Promise<void> {
  if (draggedIndex.value === null || dragOverIndex.value === null) {
    return;
  }

  const fromIndex = draggedIndex.value;
  const toIndex = dragOverIndex.value;

  if (fromIndex === toIndex) {
    draggedIndex.value = null;
    dragOverIndex.value = null;
    return;
  }

  const countries = [...enabledCountries.value];
  const [movedCountry] = countries.splice(fromIndex, 1);
  countries.splice(toIndex, 0, movedCountry);

  countriesStore.updateEnabledOrder(countries);

  draggedIndex.value = null;
  dragOverIndex.value = null;

  try {
    const codes = countries.map(c => c.code);
    await countriesStore.reorderCountries(codes);
  } catch (e) {
    await loadCountries();
    countriesError.value = (e as Error).message;
  }
}

onMounted(() => {
  loadCountries();
  loadManifest();
});
</script>

<style scoped>
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
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.bundles-loading,
.bundles-error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.bundles-error {
  background: #fff5f5;
  border-radius: 8px;
}

/* Countries Tab */
.countries-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .countries-layout {
    grid-template-columns: 1fr;
  }
}

.countries-panel {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.countries-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.countries-panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: #495057;
  border-bottom: none;
  padding-bottom: 0;
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

.search-box {
  padding: 10px;
  background: #fff;
  border-bottom: 1px solid #e9ecef;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
}

.empty-panel {
  padding: 40px 20px;
  text-align: center;
  color: #6c757d;
}

.country-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 500px;
  overflow-y: auto;
}

.country-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  transition: background-color 0.15s;
}

.country-item:last-child {
  border-bottom: none;
}

.country-item:hover {
  background: #f8f9fa;
}

.enabled-item {
  cursor: grab;
}

.enabled-item:active {
  cursor: grabbing;
}

.enabled-item.drag-over {
  background: #e3f2fd;
  border-top: 2px solid #2196f3;
}

.drag-handle {
  color: #adb5bd;
  cursor: grab;
  font-size: 14px;
}

.country-flag {
  font-size: 20px;
}

.country-name {
  flex: 1;
  color: #212529;
}

.country-code {
  color: #6c757d;
  font-family: monospace;
  font-size: 12px;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  text-decoration: none;
}

.action-btn.activate-btn {
  background: #e8f5e9;
  color: #388e3c;
}

.action-btn.activate-btn:hover {
  background: #c8e6c9;
}

.action-btn.deactivate-btn {
  background: #fff3e0;
  color: #f57c00;
}

.action-btn.deactivate-btn:hover {
  background: #ffe0b2;
}
</style>
