<template>
  <div class="import-export-view">
    <div class="import-export-header">
      <h2>{{ $t('nav.importExport') }}</h2>
    </div>

    <ImportExportPage
      :api="dataExchangeApi"
      :is-superadmin="isSuperadmin"
      :tabs="dataExchangeTabs"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ImportExportPage } from 'vbwd-view-component';
import type { DataExchangeTab } from 'vbwd-view-component';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { extensionRegistry } from '@/plugins/extensionRegistry';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const isSuperadmin = computed(() => authStore.isSuperAdmin);

// Import/Export (S46.5): adapter over the shared ApiClient + permission-gated
// contributed tabs (R7/R12). The General tab is built into ImportExportPage.
const dataExchangeApi = createDataExchangeApi();
const dataExchangeTabs = computed<DataExchangeTab[]>(() =>
  extensionRegistry
    .getDataExchangeTabs()
    .filter((tab) => !tab.requiredPermission || authStore.hasPermission(tab.requiredPermission))
    .map((tab) => ({
      id: tab.id,
      label: tab.label,
      component: tab.component,
      props: tab.props,
      order: tab.order,
    })),
);
</script>

<style scoped>
.import-export-header {
  margin-bottom: 1.5rem;
}
</style>
