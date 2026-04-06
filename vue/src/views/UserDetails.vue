<template>
  <div
    class="user-details-view"
    data-testid="user-details-view"
  >
    <div class="page-header">
      <button
        data-testid="back-button"
        class="back-btn"
        @click="goBack"
      >
        &larr; {{ $t('users.backToUsers') }}
      </button>
    </div>

    <div
      v-if="loading"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('users.loadingDetails') }}</p>
    </div>

    <div
      v-else-if="error"
      data-testid="error-message"
      class="error-state"
    >
      <p>{{ error }}</p>
      <button
        class="retry-btn"
        @click="fetchUser"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <template v-else-if="user">
      <div class="user-header">
        <div class="user-info">
          <h2>{{ user.name }}</h2>
          <p class="user-email">
            {{ user.email }}
          </p>
        </div>
        <div class="user-status">
          <span
            v-if="user.is_active"
            data-testid="status-active"
            class="status-badge active"
          >
            {{ $t('users.active') }}
          </span>
          <span
            v-else
            data-testid="status-inactive"
            class="status-badge inactive"
          >
            {{ $t('users.inactive') }}
          </span>
        </div>
      </div>

      <div class="user-sections">
        <div class="section">
          <h3>{{ $t('users.accountDetails') }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('users.email') }}</label>
              <span>{{ user.email }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('users.name') }}</label>
              <span>{{ user.name }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('users.createdAt') }}</label>
              <span>{{ formatDate(user.created_at) }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('users.role') }}</label>
              <span class="role-badge">{{ user.role }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="user.subscription"
          class="section"
        >
          <h3>{{ $t('users.subscription') }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('subscriptions.plan') }}</label>
              <span>{{ user.subscription.plan || $t('common.none') }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('subscriptions.status') }}</label>
              <span
                class="subscription-status"
                :class="user.subscription.status?.toLowerCase()"
              >
                {{ user.subscription.status || $t('common.na') }}
              </span>
            </div>
            <div
              v-if="user.subscription.expires_at"
              class="info-item"
            >
              <label>{{ $t('subscriptions.expires') }}</label>
              <span>{{ formatDate(user.subscription.expires_at) }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="user.stats"
          class="section"
        >
          <h3>{{ $t('users.statistics') }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('users.totalPayments') }}</label>
              <span>{{ user.stats.total_payments }}</span>
            </div>
            <div
              v-if="user.stats.last_login"
              class="info-item"
            >
              <label>{{ $t('users.lastLogin') }}</label>
              <span>{{ formatDateTime(user.stats.last_login) }}</span>
            </div>
          </div>
        </div>

        <!-- Plugin Extensions -->
        <component
          :is="Section"
          v-for="(Section, index) in pluginSections"
          :key="index"
          :user="user"
          :loading="loading"
          :user-id="userId"
        />
      </div>

      <div class="user-actions">
        <button
          v-if="canManage"
          data-testid="edit-button"
          class="action-btn primary"
          @click="goToEdit"
        >
          {{ $t('users.editUser') }}
        </button>
        <button
          v-if="canManage && user.is_active"
          data-testid="suspend-button"
          class="action-btn danger"
          @click="handleSuspend"
        >
          {{ $t('users.suspendUser') }}
        </button>
        <button
          v-else-if="canManage && !user.is_active"
          data-testid="activate-button"
          class="action-btn success"
          @click="handleActivate"
        >
          {{ $t('users.activateUser') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUsersStore } from '@/stores/users';
import { useAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';

const route = useRoute();
const router = useRouter();
const usersStore = useUsersStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('users.manage'));

const user = computed(() => usersStore.selectedUser);
const loading = computed(() => usersStore.loading);
const error = computed(() => usersStore.error);

const userId = computed(() => route.params.id as string);
const pluginSections = computed(() => extensionRegistry.getUserDetailsSections());

async function fetchUser(): Promise<void> {
  try {
    await usersStore.fetchUser(userId.value);
  } catch {
    // Error is set in store
  }
}

function goBack(): void {
  router.push('/admin/users');
}

function goToEdit(): void {
  router.push(`/admin/users/${userId.value}/edit`);
}

async function handleSuspend(): Promise<void> {
  try {
    await usersStore.suspendUser(userId.value, 'Suspended by admin');
    await fetchUser();
  } catch {
    // Error is set in store
  }
}

async function handleActivate(): Promise<void> {
  try {
    await usersStore.activateUser(userId.value);
    await fetchUser();
  } catch {
    // Error is set in store
  }
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}

function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString();
}

onMounted(() => {
  fetchUser();
});
</script>

<style scoped>
.user-details-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.page-header {
  margin-bottom: 20px;
}

.back-btn {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.back-btn:hover {
  text-decoration: underline;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px;
  color: #666;
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
  margin-top: 15px;
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
  margin-bottom: 20px;
}

.user-info h2 {
  margin: 0 0 5px 0;
  color: #2c3e50;
}

.user-email {
  color: #666;
  margin: 0;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #f8d7da;
  color: #721c24;
}

.user-sections {
  display: grid;
  gap: 25px;
}

.section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item label {
  font-size: 0.8rem;
  color: #666;
  text-transform: uppercase;
}

.info-item span {
  font-size: 0.95rem;
  color: #2c3e50;
}

.roles-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.role-badge {
  display: inline-block;
  padding: 3px 10px;
  background: #e9ecef;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #495057;
}

.subscription-status {
  text-transform: capitalize;
}

.subscription-status.active {
  color: #155724;
}

.subscription-status.canceled,
.subscription-status.expired {
  color: #721c24;
}

.user-actions {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.action-btn.primary {
  background: #3498db;
  color: white;
}

.action-btn.primary:hover {
  background: #2980b9;
}

.action-btn.danger {
  background: #e74c3c;
  color: white;
}

.action-btn.danger:hover {
  background: #c0392b;
}

.action-btn.success {
  background: #27ae60;
  color: white;
}

.action-btn.success:hover {
  background: #1e8449;
}
</style>
