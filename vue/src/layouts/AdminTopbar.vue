<template>
  <header class="admin-topbar">
    <div class="topbar-title">
      <button
        class="sidebar-toggle"
        type="button"
        data-testid="sidebar-toggle"
        :title="collapsed ? 'Show menu' : 'Hide menu'"
        :aria-label="collapsed ? 'Show menu' : 'Hide menu'"
        @click="$emit('toggle')"
      >
        {{ collapsed ? '☰' : '«' }}
      </button>
      <h1>{{ pageTitle }}</h1>
    </div>
    <div class="topbar-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

defineProps<{ collapsed?: boolean }>();
defineEmits<{ toggle: [] }>();

const route = useRoute();

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

/* Desktop sidebar collapse toggle (mobile uses its own burger header). */
.sidebar-toggle {
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

.sidebar-toggle:hover {
  background: #f5f5f5;
}

@media (max-width: 1024px) {
  .sidebar-toggle {
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
