<template>
  <div class="routing-rules-view">
    <div class="settings-header">
      <h2>CMS Routing</h2>
    </div>

    <!-- Sub-tabs -->
    <div
      class="tabs-container"
      data-testid="routing-tabs"
    >
      <button
        data-testid="subtab-rules"
        class="tab-btn"
        :class="{ active: activeTab === 'rules' }"
        @click="activeTab = 'rules'"
      >
        Rules
      </button>
      <button
        data-testid="subtab-blocked-countries"
        class="tab-btn"
        :class="{ active: activeTab === 'blocked' }"
        @click="activeTab = 'blocked'"
      >
        Blocked countries
      </button>
    </div>

    <div class="tab-content">
      <RoutingRulesTab v-if="activeTab === 'rules'" />
      <RoutingBlockedCountries v-else-if="activeTab === 'blocked'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import RoutingRulesTab from '@/views/RoutingRulesTab.vue';
import RoutingBlockedCountries from '@/views/RoutingBlockedCountries.vue';

type RoutingSubTab = 'rules' | 'blocked';

const activeTab = ref<RoutingSubTab>('rules');
</script>

<style scoped>
.routing-rules-view {
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
