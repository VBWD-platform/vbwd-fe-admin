<template>
  <aside
    class="admin-sidebar"
    :class="{ 'admin-sidebar-mobile-open': showMobile, 'admin-sidebar-collapsed': collapsed }"
  >
    <div class="sidebar-brand">
      <h2>VBWD Admin</h2>
      <button
        class="sidebar-toggle"
        type="button"
        data-testid="sidebar-toggle"
        title="Hide menu"
        aria-label="Hide menu"
        @click="emit('toggle')"
      >
        «
      </button>
    </div>
    <nav
      class="sidebar-nav"
      data-testid="sidebar-nav"
    >
      <router-link
        to="/admin/dashboard"
        class="nav-item nav-item--with-icon"
        data-testid="nav-dashboard"
        @click="closeNav"
      >
        <Icon
          class="nav-icon"
          name="dashboard"
        />
        <span class="nav-label">{{ $t('nav.dashboard') }}</span>
      </router-link>

      <!-- All sections: core + plugin (built via extensionRegistry.buildSidebar) -->
      <div
        v-for="section in sidebarSections"
        :key="section.id"
        class="nav-section"
      >
        <button
          :data-testid="`nav-section-${section.id}`"
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
          <template
            v-for="item in section.items"
            :key="item.to"
          >
            <!-- Level 1: regular link (no children) -->
            <router-link
              v-if="!item.children || item.children.length === 0"
              :to="item.to"
              :data-testid="`nav-item-${(item.id || item.to).replace(/\//g, '-').replace(/^-/, '')}`"
              class="nav-item nav-subitem nav-item--with-icon"
              @click="closeNav"
            >
              <Icon
                class="nav-icon"
                :name="item.icon || 'default'"
              />
              <span class="nav-label">{{ item.label }}</span>
            </router-link>

            <!-- Level 1: parent with Level 2 children -->
            <div
              v-else
              class="nav-subgroup"
            >
              <div class="nav-subgroup-header">
                <router-link
                  v-if="item.to"
                  :to="item.to"
                  class="nav-item nav-subitem nav-subgroup-label nav-item--with-icon"
                  @click="closeNav"
                >
                  <Icon
                    class="nav-icon"
                    :name="item.icon || 'default'"
                  />
                  <span class="nav-label">{{ item.label }}</span>
                </router-link>
                <span
                  v-else
                  class="nav-item nav-subitem nav-subgroup-label nav-item--with-icon"
                >
                  <Icon
                    class="nav-icon"
                    :name="item.icon || 'default'"
                  />
                  <span class="nav-label">{{ item.label }}</span>
                </span>
                <button
                  class="nav-subgroup-toggle"
                  :data-testid="`nav-toggle-${(item.id || item.to || item.label).replace(/[\s/]/g, '-').toLowerCase()}`"
                  @click="toggleLevel2(item.to || item.label)"
                >
                  {{ (expandedLevel2[item.to || item.label] ?? false) ? '▾' : '▸' }}
                </button>
              </div>
              <div
                v-show="expandedLevel2[item.to || item.label] ?? false"
                class="nav-level2"
              >
                <router-link
                  v-for="child in item.children"
                  :key="child.to"
                  :to="child.to"
                  class="nav-item nav-subitem nav-level2-item nav-item--with-icon"
                  @click="closeNav"
                >
                  <Icon
                    class="nav-icon"
                    :name="child.icon || 'default'"
                  />
                  <span class="nav-label">{{ child.label }}</span>
                </router-link>
              </div>
            </div>
          </template>
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
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { Icon } from 'vbwd-view-component';
import { extensionRegistry } from '@/plugins/extensionRegistry';
import type { NavSection } from '@/plugins/extensionRegistry';

defineProps<{ showMobile?: boolean; collapsed?: boolean }>();
const emit = defineEmits<{ close: []; toggle: [] }>();

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

function closeNav() {
  emit('close');
}

const userMenuOpen = ref(false);

// Core sections — defines the named slots that plugins can inject into
const coreSections = computed((): NavSection[] => [
  {
    id: 'sales',
    label: t('nav.sales'),
    items: [
      { label: t('nav.users'), to: '/admin/users', id: 'users', icon: 'users', requiredPermission: 'users.view' },
      { label: t('nav.invoices'), to: '/admin/invoices', id: 'invoices', icon: 'invoice', requiredPermission: 'invoices.view' },
    ],
  },
  {
    id: 'settings',
    label: t('nav.settings'),
    items: [
      { label: t('nav.settings'), to: '/admin/settings', id: 'settings', icon: 'settings', requiredPermission: 'settings.view' },
      { label: t('nav.paymentMethods'), to: '/admin/payment-methods', id: 'payment-methods', icon: 'card', requiredPermission: 'settings.manage' },
      { label: t('nav.taxesAndCountries'), to: '/admin/settings/tax-and-countries', id: 'taxes-and-countries', icon: 'percent', requiredPermission: 'settings.manage' },
      { label: t('nav.customFields'), to: '/admin/settings/custom-fields', id: 'custom-fields', icon: 'list', requiredPermission: 'settings.manage' },
      { label: t('nav.rolesAndAccessLevels'), to: '/admin/settings/access', id: 'access-levels', icon: 'shield', requiredPermission: 'settings.system' },
      { label: t('nav.userGroups'), to: '/admin/settings/user_groups', id: 'user-groups', icon: 'group', requiredPermission: 'settings.manage' },
      { label: t('nav.logs'), to: '/admin/logs', id: 'logs', icon: 'logs', requiredPermission: 'logs.read' },
      // Import/Export stays the LAST settings item by invariant (S46.5).
      { label: t('nav.importExport'), to: '/admin/import-export', id: 'import-export', icon: 'exchange', requiredPermission: 'settings.view' },
    ],
  },
]);

// Build complete sidebar: core sections + plugin injections + plugin sections
// Then filter by user permissions
const sidebarSections = computed((): NavSection[] => {
  const sections = extensionRegistry.buildSidebar(coreSections.value);

  // Filter items by requiredPermission
  return sections.map(section => ({
    ...section,
    items: section.items
      .filter(item => !item.requiredPermission || authStore.hasPermission(item.requiredPermission))
      .map(item => ({
        ...item,
        children: item.children?.filter(child =>
          !child.requiredPermission || authStore.hasPermission(child.requiredPermission)
        ),
      })),
  })).filter(section => section.items.length > 0);
});

// Tracks expanded state per section id (default: expanded)
const expandedSections = reactive<Record<string, boolean>>({});
// Tracks expanded state for Level 2 sub-groups (default: collapsed)
const expandedLevel2 = reactive<Record<string, boolean>>({});

function toggleSection(sectionId: string): void {
  expandedSections[sectionId] = !(expandedSections[sectionId] ?? true);
}

function toggleLevel2(itemKey: string): void {
  expandedLevel2[itemKey] = !(expandedLevel2[itemKey] ?? false);
}

function isSectionActive(section: NavSection): boolean {
  const path = route.path;
  return section.items.some((item) => {
    if (path.startsWith(item.to)) return true;
    if (item.children) {
      return item.children.some((child) => path.startsWith(child.to));
    }
    return false;
  });
}

const userEmail = computed((): string => {
  return authStore.user?.email || 'Admin';
});

function toggleUserMenu(): void {
  userMenuOpen.value = !userMenuOpen.value;
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
  transition: transform 0.25s ease;
}

/* Desktop collapse — slide the sidebar off-screen so content fills the width.
   Declared before the mobile media block so mobile-open still overrides it. */
.admin-sidebar-collapsed {
  transform: translateX(-100%);
}

.sidebar-brand {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.sidebar-brand h2 {
  margin: 0;
  font-size: 1.3rem;
}

/* Hide-menu toggle, moved here from the topbar (light-on-dark sidebar). */
.sidebar-brand .sidebar-toggle {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  color: inherit;
  flex-shrink: 0;
}

.sidebar-brand .sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.12);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.nav-item {
  display: block;
  padding: 10px 20px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

/* Icon + label rows: align the glyph with the text. */
.nav-item--with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-icon {
  opacity: 0.75;
}

.nav-item--with-icon:hover .nav-icon,
.nav-item--with-icon.router-link-active .nav-icon {
  opacity: 1;
}

.nav-label {
  flex: 1;
  min-width: 0;
}

.nav-item.router-link-active,
.nav-item.router-link-exact-active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-section {
  margin-top: 5px;
}

.nav-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 10px 20px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: color 0.2s;
}

.nav-section-header:hover {
  color: rgba(255, 255, 255, 0.8);
}

.nav-section-header.has-active {
  color: rgba(255, 255, 255, 0.9);
}

.expand-arrow {
  font-size: 0.65rem;
}

.nav-submenu {
  padding-left: 0;
}

.nav-subitem {
  padding-left: 30px;
  font-size: 0.85rem;
}

/* Level 2 sub-group */
.nav-subgroup {
  margin: 0;
}

.nav-subgroup-header {
  display: flex;
  align-items: center;
}

.nav-subgroup-label {
  flex: 1;
}

.nav-subgroup-toggle {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px 12px;
  font-size: 0.8rem;
}

.nav-subgroup-toggle:hover {
  color: white;
}

.nav-level2 {
  padding-left: 0;
}

.nav-level2-item {
  padding-left: 45px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.nav-level2-item:hover {
  color: white;
}

/* Footer */
.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px;
}

.user-menu {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  border-radius: 4px;
}

.user-menu:hover {
  background: rgba(255, 255, 255, 0.05);
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-email {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
}

.user-role {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.menu-arrow {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.5);
}

.user-dropdown {
  margin-top: 5px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.dropdown-item {
  display: block;
  padding: 8px 15px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 0.85rem;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.logout-item {
  color: #e74c3c;
}

.logout-item:hover {
  background: rgba(231, 76, 60, 0.1);
}

/* Mobile */
@media (max-width: 768px) {
  .admin-sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s;
    z-index: 1000;
  }

  .admin-sidebar-mobile-open {
    transform: translateX(0);
  }
}
</style>
