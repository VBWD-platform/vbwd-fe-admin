<template>
  <div class="admin-layout">
    <!-- Mobile Header -->
    <header class="admin-mobile-header">
      <button
        class="admin-burger"
        :class="{ active: showMobileMenu }"
        data-testid="admin-burger-menu"
        @click="toggleMobileMenu"
      >
        <span />
        <span />
        <span />
      </button>
      <div class="admin-logo-mobile">
        <h2>VBWD Admin</h2>
      </div>
    </header>

    <AdminSidebar
      :show-mobile="showMobileMenu"
      :collapsed="sidebarCollapsed"
      @close="closeMobileMenu"
      @toggle="toggleSidebar"
    />

    <!-- Mobile Overlay -->
    <div
      v-if="showMobileMenu"
      class="admin-mobile-overlay"
      @click="closeMobileMenu"
    />

    <div
      class="admin-main"
      :class="{ 'admin-main--full': sidebarCollapsed }"
    >
      <AdminTopbar
        :collapsed="sidebarCollapsed"
        @toggle="toggleSidebar"
      >
        <template #actions>
          <slot name="actions" />
        </template>
      </AdminTopbar>
      <main class="admin-content">
        <!-- License-expired state: a CMS admin API 402 (LICENSE_REQUIRED and no
             covering key) flips the global license-block flag. Show a prominent
             banner over the content instead of a generic error. -->
        <div
          v-if="isLicenseBlocked"
          data-testid="license-expired-banner"
          class="license-expired-banner"
          role="alert"
        >
          <div class="license-expired-banner__body">
            <strong class="license-expired-banner__title">
              {{ $t('license.expiredBannerTitle') }}
            </strong>
            <span class="license-expired-banner__message">
              {{ $t('license.expiredBanner') }}
            </span>
          </div>
          <router-link
            to="/admin/settings"
            class="license-expired-banner__action"
          >
            {{ $t('license.expiredBannerAction') }}
          </router-link>
        </div>
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import AdminSidebar from './AdminSidebar.vue';
import AdminTopbar from './AdminTopbar.vue';
import { useLicenseStore } from '@/stores/license';

const SIDEBAR_KEY = 'admin_sidebar_collapsed';

// Global "License expired" state, tripped when a CMS admin API call 402s.
const licenseStore = useLicenseStore();
const { isLicenseBlocked } = storeToRefs(licenseStore);

const showMobileMenu = ref(false);
// Desktop sidebar collapse — remembered across reloads so the admin keeps the
// extra content width they chose.
const sidebarCollapsed = ref(localStorage.getItem(SIDEBAR_KEY) === '1');

watch(sidebarCollapsed, (collapsed) => {
  localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
});

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value;
}

function closeMobileMenu() {
  showMobileMenu.value = false;
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

/* Mobile Header (hidden on desktop) */
.admin-mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: #2c3e50;
  color: white;
  z-index: 1001;
  align-items: center;
  padding: 0 20px;
  gap: 15px;
}

.admin-burger {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.admin-burger span {
  width: 25px;
  height: 3px;
  background-color: white;
  border-radius: 2px;
  transition: all 0.3s;
  display: block;
}

.admin-burger.active span:nth-child(1) {
  transform: translateY(9px) rotate(45deg);
}

.admin-burger.active span:nth-child(2) {
  opacity: 0;
}

.admin-burger.active span:nth-child(3) {
  transform: translateY(-9px) rotate(-45deg);
}

.admin-logo-mobile {
  flex: 1;
}

.admin-logo-mobile h2 {
  margin: 0;
  font-size: 1.3rem;
  color: white;
}

.admin-mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.admin-main {
  flex: 1;
  margin-left: 250px;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  transition: margin-left 0.25s ease;
}

/* Sidebar collapsed (desktop): reclaim the full width for content. */
.admin-main--full {
  margin-left: 0;
}

.admin-content {
  flex: 1;
  padding: 30px;
}

/* License-expired banner — prominent, theme-aware, uses admin design tokens. */
.license-expired-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  padding: 16px 20px;
  border: 1px solid var(--admin-danger, #e74c3c);
  border-left-width: 4px;
  border-radius: 6px;
  background: var(--admin-badge-no-bg, #f8d7da);
  color: var(--admin-badge-no, #721c24);
}

.license-expired-banner__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.license-expired-banner__title {
  font-size: 1.05rem;
  font-weight: 700;
}

.license-expired-banner__message {
  color: var(--admin-badge-no, #721c24);
}

.license-expired-banner__action {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 4px;
  background: var(--admin-danger, #e74c3c);
  color: #ffffff;
  text-decoration: none;
  font-weight: 600;
}

.license-expired-banner__action:hover {
  background: var(--admin-danger-hover, #c0392b);
}

@media (max-width: 1024px) {
  .admin-mobile-header {
    display: flex;
  }

  .admin-main {
    margin-left: 0;
    margin-top: 60px;
  }

  .admin-content {
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .admin-content {
    padding: 15px;
  }
}
</style>
