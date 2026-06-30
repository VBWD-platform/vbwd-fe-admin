<template>
  <header class="admin-topbar">
    <div class="topbar-title">
      <!-- Reopen the menu when the sidebar is collapsed (the hide-toggle now
           lives in the sidebar brand, which is off-screen while collapsed). -->
      <button
        v-if="collapsed"
        class="topbar-btn sidebar-show"
        type="button"
        data-testid="sidebar-show"
        title="Show menu"
        aria-label="Show menu"
        @click="$emit('toggle')"
      >
        ☰
      </button>
      <!-- Browser-style back, on every admin page. -->
      <button
        class="topbar-btn topbar-back"
        type="button"
        data-testid="topbar-back"
        title="Back"
        aria-label="Back"
        @click="goBack"
      >
        ←
      </button>
      <h1>{{ pageTitle }}</h1>
    </div>
    <div class="topbar-actions">
      <!-- Plugin-contributed actions, right-aligned. Core stays agnostic: each
           action is a self-contained component a plugin registers via the
           extension registry (e.g. the CMS "Home" link). -->
      <component
        :is="action.component"
        v-for="action in topbarActions"
        :key="action.id"
      />
      <!-- Per-page actions still flow through the named slot. -->
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';

defineProps<{ collapsed?: boolean }>();
defineEmits<{ toggle: [] }>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Right-aligned, plugin-injectable topbar actions, filtered by permission.
const topbarActions = computed(() =>
  extensionRegistry
    .getTopbarActions()
    .filter(
      (action) =>
        !action.requiredPermission || authStore.hasPermission(action.requiredPermission),
    ),
);

// Literal browser-back. Falls back to the dashboard when there is no history
// to go back to (e.g. the admin was opened directly on this page).
function goBack(): void {
  if (window.history.length > 1) router.back();
  else router.push('/admin/dashboard');
}

const pageTitle = computed((): string => {
  // Plugin-contributed routes carry their own title via meta.title, so core
  // stays agnostic (no hardcoded plugin route titles here).
  const metaTitle = route.meta?.title as string | undefined;
  if (metaTitle) return metaTitle;

  const titles: Record<string, string> = {
    'dashboard': 'Dashboard',
    'users': 'User Management',
    'invoices': 'Invoices',
    'settings': 'Settings'
  };

  const routeName = route.name as string;
  return titles[routeName] || 'Admin';
});
</script>

<style scoped>
.admin-topbar {
  background-color: white;
  padding: 20px 30px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topbar-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.topbar-title h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
}

/* Topbar buttons: back (always) + show-menu (only while collapsed). */
.topbar-btn {
  background: none;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  color: #2c3e50;
  flex-shrink: 0;
}

.topbar-btn:hover {
  background: #f5f5f5;
}

/* The collapsed "show menu" reopen affordance is desktop-only — mobile uses
   its own burger header. The back button stays available everywhere. */
@media (max-width: 1024px) {
  .sidebar-show {
    display: none;
  }
}

.topbar-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

@media (max-width: 1024px) {
  .admin-topbar {
    padding: 15px 20px;
  }

  .topbar-title h1 {
    font-size: 1.2rem;
  }
}
</style>
