<template>
  <div class="tax-countries-view">
    <div class="settings-header">
      <h2>{{ $t('taxAndCountries.title') }}</h2>
    </div>

    <!-- Sub-tabs -->
    <div
      class="tabs-container"
      data-testid="tax-countries-tabs"
    >
      <button
        data-testid="subtab-countries"
        class="tab-btn"
        :class="{ active: activeTab === 'countries' }"
        @click="activeTab = 'countries'"
      >
        {{ $t('taxAndCountries.countriesTab') }}
      </button>
      <button
        data-testid="subtab-tax"
        class="tab-btn"
        :class="{ active: activeTab === 'tax' }"
        @click="activeTab = 'tax'"
      >
        {{ $t('taxAndCountries.taxTab') }}
      </button>
      <button
        data-testid="subtab-currencies"
        class="tab-btn"
        :class="{ active: activeTab === 'currencies' }"
        @click="activeTab = 'currencies'"
      >
        {{ $t('taxAndCountries.currenciesTab') }}
      </button>
    </div>

    <div class="tab-content">
      <CountriesTab v-show="activeTab === 'countries'" />
      <TaxesTab
        v-if="taxMounted"
        v-show="activeTab === 'tax'"
      />
      <CurrenciesTab
        v-if="currenciesMounted"
        v-show="activeTab === 'currencies'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import CountriesTab from '@/views/tax-countries/CountriesTab.vue';
import TaxesTab from '@/views/tax-countries/TaxesTab.vue';
import CurrenciesTab from '@/views/tax-countries/CurrenciesTab.vue';

type SubTab = 'countries' | 'tax' | 'currencies';

const activeTab = ref<SubTab>('countries');
const taxMounted = ref(false);
const currenciesMounted = ref(false);

watch(activeTab, (newTab) => {
  if (newTab === 'tax') {
    taxMounted.value = true;
  } else if (newTab === 'currencies') {
    currenciesMounted.value = true;
  }
}, { immediate: true });
</script>

<style scoped>
.tax-countries-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.settings-header {
  margin-bottom: 20px;
}

.settings-header h2 {
  margin: 0;
  color: #2c3e50;
}

.tabs-container {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 20px;
}

.tab-btn {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #3498db;
}

.tab-btn.active {
  color: #3498db;
  border-bottom-color: #3498db;
}

.tab-content {
  padding: 10px 0;
}
</style>
