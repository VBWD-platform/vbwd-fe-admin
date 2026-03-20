<template>
  <aside
    class="admin-sidebar"
    :class="{ 'admin-sidebar-mobile-open': showMobile }"
  >
    <div class="sidebar-brand">
      <h2>VBWD Admin</h2>
    </div>
    <nav
      class="sidebar-nav"
      data-testid="sidebar-nav"
    >
      <router-link
        to="/admin/dashboard"
        class="nav-item"
        data-testid="nav-dashboard"
        @click="closeNav"
      >
        {{ $t('nav.dashboard') }}
      </router-link>
      <!-- Sales Expandable Section -->
      <div class="nav-section">
        <button
          class="nav-section-header"
          :class="{ expanded: salesExpanded, 'has-active': isSalesActive }"
          data-testid="nav-sales"
          @click="toggleSales"
        >
          <span>{{ $t('nav.sales') }}</span>
          <span class="expand-arrow">{{ salesExpanded ? '▼' : '▶' }}</span>
        </button>
        <div
          v-show="salesExpanded"
          class="nav-submenu"
        >
          <router-link
            to="/admin/users"
            class="nav-item nav-subitem"
            data-testid="nav-users"
            @click="closeNav"
          >
            {{ $t('nav.users') }}
          </router-link>
          <router-link
            to="/admin/subscriptions"
            class="nav-item nav-subitem"
            data-testid="nav-subscriptions"
            @click="closeNav"
          >
            {{ $t('nav.subscriptions') }}
          </router-link>
          <router-link
            to="/admin/invoices"
            class="nav-item nav-subitem"
            data-testid="nav-invoices"
            @click="closeNav"
          >
            {{ $t('nav.invoices') }}
          </router-link>
        </div>
      </div>

      <!-- Tarifs Expandable Section -->
      <div class="nav-section">
        <button
          class="nav-section-header"
          :class="{ expanded: tarifsExpanded, 'has-active': isTarifsActive }"
          data-testid="nav-tarifs"
          @click="toggleTarifs"
        >
          <span>{{ $t('nav.tarifs') }}</span>
          <span class="expand-arrow">{{ tarifsExpanded ? '▼' : '▶' }}</span>
        </button>
        <div
          v-show="tarifsExpanded"
          class="nav-submenu"
        >
          <router-link
            to="/admin/plans"
            class="nav-item nav-subitem"
            data-testid="nav-plans"
            @click="closeNav"
          >
            {{ $t('nav.plans') }}
          </router-link>
          <router-link
            to="/admin/add-ons"
            class="nav-item nav-subitem"
            data-testid="nav-addons"
            @click="closeNav"
          >
            {{ $t('nav.addOns') }}
          </router-link>
        </div>
      </div>

      <!-- Plugin nav sections (registered via extensionRegistry) -->
      <div
        v-for="section in pluginNavSections"
        :key="section.id"
        class="nav-section"
      >
        <button
          :id="`nav-section-${section.id}`"
          class="nav-section-header"
          :class="{ expanded: expandedSections[section.id] ?? true, 'has-active': isSectionActive(section) }"
          @click="toggleSection(section.id)"
        >
          <span>{{ section.label }}</span>
          <span class="expand-arrow">{{ (expandedSections[section.id] ?? true) ? '▼' : '▶' }}</span>
        </button>
        <div
          v-show="expandedSections[section.id] ?? true"
          class="nav-submenu"
        >
          <router-link
            v-for="item in section.items"
            :key="item.to"
            :id="`nav-item-${item.to.replace(/\//g, '-').replace(/^-/, '')}`"
            :to="item.to"
            class="nav-item nav-subitem"
            @click="closeNav"
          >
            {{ item.label }}
          </router-link>
        </div>
      </div>

      <!-- Settings Expandable Section -->
      <div class="nav-section">
        <button
          class="nav-section-header"
          :class="{ expanded: settingsExpanded, 'has-active': isSettingsActive }"
          data-testid="nav-settings-section"
          @click="toggleSettings"
        >
          <span>{{ $t('nav.settings') }}</span>
          <span class="expand-arrow">{{ settingsExpanded ? '▼' : '▶' }}</span>
        </button>
        <div
          v-show="settingsExpanded"
          class="nav-submenu"
        >
          <router-link
            to="/admin/settings"
            class="nav-item nav-subitem"
            data-testid="nav-settings"
            @click="closeNav"
          >
            {{ $t('nav.settings') }}
          </router-link>
          <router-link
            to="/admin/payment-methods"
            class="nav-item nav-subitem"
            data-testid="nav-payment-methods"
            @click="closeNav"
          >
            {{ $t('nav.paymentMethods') }}
          </router-link>
          <router-link
            v-for="item in pluginSettingsItems"
            :key="item.to"
            :to="item.to"
            class="nav-item nav-subitem"
            @click="closeNav"
          >
            {{ item.label }}
          </router-link>
        </div>
      </div>
    </nav>
    <div class="sidebar-footer">
      <div
        class="user-menu"
        data-testid="user-menu"
        @click="toggleUserMenu"
      >
        <div class="user-info">
          <span class="user-email">{{ userEmail }}</span>
          <span class="user-role">{{ $t('users.roles.admin') }}</span>
        </div>
        <span class="menu-arrow">{{ userMenuOpen ? '▲' : '▼' }}</span>
      </div>
      <div
        v-if="userMenuOpen"
        class="user-dropdown"
      >
        <router-link
          to="/admin/profile"
          class="dropdown-item"
          data-testid="profile-link"
          @click="userMenuOpen = false; closeNav()"
        >
          {{ $t('nav.profile') }}
        </router-link>
        <button
          data-testid="logout-button"
          class="dropdown-item logout-item"
          @click="handleLogout"
        >
          {{ $t('nav.logout') }}
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';
import type { NavSection, NavItem } from '@/plugins/extensionRegistry';

defineProps<{ showMobile?: boolean }>();
const emit = defineEmits<{ close: [] }>();

function closeNav() {
  emit('close');
}

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const userMenuOpen = ref(false);
const salesExpanded = ref(true);
const tarifsExpanded = ref(true);
const settingsExpanded = ref(true);

// Plugin nav sections from extensionRegistry
const pluginNavSections = computed((): NavSection[] => extensionRegistry.getNavSections());

// Plugin items injected into the Settings section
const pluginSettingsItems = computed((): NavItem[] => extensionRegistry.getSettingsItems());

// Tracks expanded state per section id (default: expanded)
const expandedSections = reactive<Record<string, boolean>>({});

function toggleSection(id: string): void {
  expandedSections[id] = !(expandedSections[id] ?? true);
}

function isSectionActive(section: NavSection): boolean {
  return section.items.some(item => route.path.startsWith(item.to));
}

const userEmail = computed((): string => {
  return authStore.user?.email || 'Admin';
});

// Check if current route is within Sales section
const isSalesActive = computed((): boolean => {
  const path = route.path;
  return path.includes('/admin/users') || path.includes('/admin/subscriptions') || path.includes('/admin/invoices');
});

// Check if current route is within Tarifs section
const isTarifsActive = computed((): boolean => {
  const path = route.path;
  return path.includes('/admin/plans') || path.includes('/admin/add-ons');
});

// Check if current route is within Settings section
const isSettingsActive = computed((): boolean => {
  const path = route.path;
  if (path.includes('/admin/settings') || path.includes('/admin/payment-methods')) return true;
  return pluginSettingsItems.value.some(item => path.startsWith(item.to));
});

function toggleUserMenu(): void {
  userMenuOpen.value = !userMenuOpen.value;
}

function toggleSales(): void {
  salesExpanded.value = !salesExpanded.value;
}

function toggleTarifs(): void {
  tarifsExpanded.value = !tarifsExpanded.value;
}

function toggleSettings(): void {
  settingsExpanded.value = !settingsExpanded.value;
}

async function handleLogout(): Promise<void> {
  await authStore.logout();
  router.push('/admin/login');
}
</script>

<style scoped>
.admin-sidebar {
  width: 250px;
  background-color: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
}

.sidebar-brand {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-brand h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  padding: 15px 0;
  overflow-y: auto;
}

.nav-item {
  display: block;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: white;
}

.nav-item.router-link-active {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border-left-color: #3498db;
}

/* Expandable Section */
.nav-section {
  margin: 0;
}

.nav-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 20px;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
  text-align: left;
  transition: all 0.2s ease;
}

.nav-section-header:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: white;
}

.nav-section-header.has-active {
  color: white;
  border-left-color: #3498db;
}

.nav-section-header.expanded {
  background-color: rgba(255, 255, 255, 0.03);
}

.expand-arrow {
  font-size: 0.7rem;
  opacity: 0.7;
}

.nav-submenu {
  background-color: rgba(0, 0, 0, 0.15);
}

.nav-subitem {
  padding-left: 35px;
  font-size: 0.95em;
}

.nav-subitem.router-link-active {
  background-color: rgba(255, 255, 255, 0.08);
}

.sidebar-footer {
  padding: 15px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.user-info {
  margin-bottom: 12px;
}

.user-email {
  display: block;
  font-size: 0.9rem;
  color: white;
  margin-bottom: 2px;
}

.user-role {
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.logout-btn {
  width: 100%;
  padding: 10px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
}

.logout-btn:hover {
  background-color: #c0392b;
}

.user-menu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 10px;
  margin: -10px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.user-menu:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.menu-arrow {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
}

.user-dropdown {
  margin-top: 10px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 15px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
}

.dropdown-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.logout-item {
  color: #e74c3c;
}

.logout-item:hover {
  background-color: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

/* Mobile: slide-in sidebar */
@media (max-width: 1024px) {
  .admin-sidebar {
    position: fixed;
    left: 0;
    top: 60px;
    height: calc(100vh - 60px);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
    z-index: 1000;
  }

  .admin-sidebar-mobile-open {
    transform: translateX(0);
  }

  .sidebar-brand {
    display: none;
  }
}

@media (max-width: 768px) {
  .admin-sidebar {
    width: 100%;
  }
}
</style>
