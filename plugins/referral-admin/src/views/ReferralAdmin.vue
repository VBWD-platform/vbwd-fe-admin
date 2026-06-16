<template>
  <div class="referral-admin-view">
    <div class="settings-header">
      <h2>{{ $t('referralAdmin.title') }}</h2>
    </div>

    <div
      class="tabs-container"
      data-testid="referral-admin-tabs"
    >
      <button
        v-if="canManage"
        data-testid="referral-subtab-settings"
        class="tab-btn"
        :class="{ active: activeTab === 'settings' }"
        @click="activeTab = 'settings'"
      >
        {{ $t('referralAdmin.settingsTab') }}
      </button>
      <button
        data-testid="referral-subtab-statistics"
        class="tab-btn"
        :class="{ active: activeTab === 'statistics' }"
        @click="activeTab = 'statistics'"
      >
        {{ $t('referralAdmin.statisticsTab') }}
      </button>
    </div>

    <div class="tab-content">
      <ReferralSettingsTab
        v-if="canManage"
        v-show="activeTab === 'settings'"
      />
      <ReferralStatisticsTab
        v-if="statisticsMounted"
        v-show="activeTab === 'statistics'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import ReferralSettingsTab from './ReferralSettingsTab.vue';
import ReferralStatisticsTab from './ReferralStatisticsTab.vue';

type SubTab = 'settings' | 'statistics';

const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('referral.manage'));

// Default to the tab the admin can actually see.
const activeTab = ref<SubTab>(canManage.value ? 'settings' : 'statistics');

// Lazy-mount the statistics tab the first time it is shown.
const statisticsMounted = ref(activeTab.value === 'statistics');
watch(activeTab, (tab) => {
  if (tab === 'statistics') {
    statisticsMounted.value = true;
  }
});
</script>

<style scoped>
.referral-admin-view { background: white; padding: 20px; border-radius: 8px; }
.settings-header { margin-bottom: 20px; }
.settings-header h2 { margin: 0; }
.tabs-container { display: flex; gap: 4px; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px; }
.tab-btn { padding: 10px 18px; border: none; background: none; cursor: pointer; font-size: 14px; color: #6b7280; border-bottom: 2px solid transparent; }
.tab-btn.active { color: #3b82f6; border-bottom-color: #3b82f6; font-weight: 600; }
</style>
