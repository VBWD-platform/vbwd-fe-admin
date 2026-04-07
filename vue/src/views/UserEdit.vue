<template>
  <div
    class="user-edit-view"
    data-testid="user-edit-view"
  >
    <div class="form-header">
      <button
        data-testid="back-button"
        class="back-btn"
        @click="goBack"
      >
        &larr; {{ $t('users.backToUsers') }}
      </button>
    </div>

    <div
      v-if="loadingUser"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('users.loadingUser') }}</p>
    </div>

    <div
      v-else-if="loadError"
      data-testid="load-error"
      class="error-state"
    >
      <p>{{ loadError }}</p>
      <button
        class="retry-btn"
        @click="fetchUser"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <template v-else>
      <h2 data-testid="form-title">
        {{ $t('users.editUser') }}
      </h2>

      <!-- Tab Navigation -->
      <div
        class="tabs-container"
        data-testid="user-edit-tabs"
      >
        <button
          data-testid="tab-account"
          class="tab-btn"
          :class="{ active: activeTab === 'account' }"
          @click="activeTab = 'account'"
        >
          {{ $t('users.account') }}
        </button>
        <button
          data-testid="tab-subscriptions"
          class="tab-btn"
          :class="{ active: activeTab === 'subscriptions' }"
          @click="switchToSubscriptions"
        >
          {{ $t('nav.subscriptions') }}
        </button>
        <button
          data-testid="tab-invoices"
          class="tab-btn"
          :class="{ active: activeTab === 'invoices' }"
          @click="switchToInvoices"
        >
          {{ $t('nav.invoices') }}
        </button>
        <button
          data-testid="tab-addons"
          class="tab-btn"
          :class="{ active: activeTab === 'addons' }"
          @click="switchToAddons"
        >
          {{ $t('users.addons') }}
        </button>
      </div>

      <!-- Account Tab Content -->
      <div
        v-show="activeTab === 'account'"
        data-testid="tab-content-account"
        class="tab-content"
      >
        <form
          data-testid="user-form"
          class="user-form"
          @submit.prevent="handleSubmit"
        >
          <div
            v-if="validationError"
            data-testid="validation-error"
            class="validation-error"
          >
            {{ validationError }}
          </div>

          <div
            v-if="submitError"
            data-testid="submit-error"
            class="submit-error"
          >
            {{ submitError }}
          </div>

          <!-- Account Section -->
          <section class="form-section">
            <h3>{{ $t('users.account') }}</h3>

            <div class="form-group">
              <label for="email">{{ $t('users.email') }}</label>
              <input
                id="email"
                v-model="formData.email"
                name="email"
                type="email"
                class="form-input readonly"
                readonly
                disabled
              >
              <small class="help-text">{{ $t('profile.emailReadonly') }}</small>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="status">{{ $t('users.status') }}</label>
                <select
                  id="status"
                  v-model="formData.is_active"
                  name="status"
                  data-testid="status-select"
                  class="form-select"
                  :disabled="!canManage"
                >
                  <option :value="true">
                    {{ $t('users.active') }}
                  </option>
                  <option :value="false">
                    {{ $t('users.inactive') }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="role">{{ $t('users.role') }}</label>
                <span class="role-display">{{ usersStore.selectedUser?.role || '-' }}</span>
              </div>
            </div>

            <div
              v-if="availableRoles.length > 0 && usersStore.selectedUser?.role === 'ADMIN'"
              class="form-row"
            >
              <div class="form-group">
                <label>Access Levels</label>
                <div class="role-checkboxes">
                  <label
                    v-for="role in availableRoles"
                    :key="role.id"
                    class="role-checkbox"
                  >
                    <input
                      type="checkbox"
                      :checked="assignedRoleIds.has(role.id)"
                      :disabled="!canManage"
                      @change="toggleRole(role.id)"
                    >
                    <span>{{ role.name }}</span>
                    <span
                      v-if="role.is_system"
                      class="role-badge"
                    >system</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- User Access Levels (all users) -->
            <div
              v-if="availableUserLevels.length > 0"
              class="form-row"
            >
              <div class="form-group">
                <label>User Access Levels</label>
                <div class="role-checkboxes">
                  <label
                    v-for="level in availableUserLevels"
                    :key="level.id"
                    class="role-checkbox"
                  >
                    <input
                      type="checkbox"
                      :checked="assignedUserLevelIds.has(level.id)"
                      :disabled="!canManage"
                      @change="toggleUserLevel(level.id)"
                    >
                    <span>{{ level.name }}</span>
                    <span
                      v-if="level.is_system"
                      class="role-badge"
                    >system</span>
                    <span
                      v-if="level.linked_plan_slug"
                      class="role-badge role-badge--plan"
                    >{{ level.linked_plan_slug }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="newPassword">{{ $t('users.newPassword') }}</label>
              <input
                id="newPassword"
                v-model="formData.new_password"
                name="newPassword"
                type="password"
                data-testid="new-password-input"
                :placeholder="$t('users.newPasswordPlaceholder')"
                class="form-input"
                :disabled="!canManage"
              >
              <small
                class="help-text"
                data-testid="new-password-help"
              >
                {{ $t('users.newPasswordHelp') }}
              </small>
            </div>
          </section>

          <!-- Personal Details Section -->
          <section class="form-section">
            <h3>{{ $t('users.personalDetails') }}</h3>

            <div class="form-row">
              <div class="form-group">
                <label for="firstName">{{ $t('users.firstName') }}</label>
                <input
                  id="firstName"
                  v-model="formData.first_name"
                  name="firstName"
                  type="text"
                  placeholder="John"
                  class="form-input"
                >
              </div>

              <div class="form-group">
                <label for="lastName">{{ $t('users.lastName') }}</label>
                <input
                  id="lastName"
                  v-model="formData.last_name"
                  name="lastName"
                  type="text"
                  placeholder="Doe"
                  class="form-input"
                >
              </div>
            </div>

            <div class="form-group">
              <label for="phone">{{ $t('users.phone') }}</label>
              <input
                id="phone"
                v-model="formData.phone"
                name="phone"
                type="tel"
                class="form-input"
              >
            </div>

            <div class="form-group">
              <label for="company">{{ $t('users.company') }}</label>
              <input
                id="company"
                v-model="formData.company"
                name="company"
                type="text"
                class="form-input"
              >
            </div>

            <div class="form-group">
              <label for="taxNumber">{{ $t('users.taxNumber') }}</label>
              <input
                id="taxNumber"
                v-model="formData.tax_number"
                name="taxNumber"
                type="text"
                class="form-input"
              >
            </div>
          </section>

          <!-- Address Section -->
          <section class="form-section">
            <h3>{{ $t('profile.addressInfo') }}</h3>

            <div class="form-group">
              <label for="addressLine1">{{ $t('users.addressLine1') }}</label>
              <input
                id="addressLine1"
                v-model="formData.address_line_1"
                name="addressLine1"
                type="text"
                class="form-input"
              >
            </div>

            <div class="form-group">
              <label for="addressLine2">{{ $t('users.addressLine2') }}</label>
              <input
                id="addressLine2"
                v-model="formData.address_line_2"
                name="addressLine2"
                type="text"
                class="form-input"
              >
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="postalCode">{{ $t('users.postalCode') }}</label>
                <input
                  id="postalCode"
                  v-model="formData.postal_code"
                  name="postalCode"
                  type="text"
                  class="form-input"
                >
              </div>

              <div class="form-group">
                <label for="city">{{ $t('users.city') }}</label>
                <input
                  id="city"
                  v-model="formData.city"
                  name="city"
                  type="text"
                  class="form-input"
                >
              </div>
            </div>

            <div class="form-group">
              <label for="country">{{ $t('users.country') }}</label>
              <input
                id="country"
                v-model="formData.country"
                name="country"
                type="text"
                placeholder="DE"
                maxlength="2"
                class="form-input"
                style="max-width: 100px; text-transform: uppercase;"
              >
            </div>
          </section>

          <!-- Token Balance Section -->
          <section class="form-section">
            <h3>{{ $t('users.tokenBalance') }}</h3>

            <div class="form-group">
              <label for="tokenBalance">{{ $t('users.tokenBalance') }}</label>
              <input
                id="tokenBalance"
                v-model="formData.token_balance"
                name="tokenBalance"
                type="number"
                step="1"
                min="0"
                data-testid="balance-input"
                class="form-input balance-input"
                :disabled="!canManage"
              >
              <small class="help-text">
                {{ $t('users.tokenBalanceHelp') }}
              </small>
            </div>
          </section>

          <!-- Plugin Extensions -->
          <component
            :is="Section"
            v-for="(Section, index) in pluginSections"
            :key="index"
            :user="usersStore.selectedUser"
            :loading="loadingUser"
            :user-id="userId"
          />

          <!-- Form Actions -->
          <div class="form-actions">
            <button
              type="button"
              data-testid="cancel-button"
              class="cancel-btn"
              @click="goBack"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              v-if="canManage"
              type="submit"
              data-testid="submit-button"
              class="submit-btn"
              :disabled="submitting"
            >
              {{ submitting ? $t('users.saving') : $t('common.saveChanges') }}
            </button>
          </div>
        </form>
      </div>

      <!-- Subscriptions Tab Content -->
      <div
        v-show="activeTab === 'subscriptions'"
        data-testid="tab-content-subscriptions"
        class="tab-content"
      >
        <div class="tab-filters">
          <input
            v-model="subscriptionSearch"
            type="text"
            data-testid="subscriptions-search-input"
            :placeholder="$t('subscriptions.searchPlaceholder')"
            class="search-input"
          >
        </div>

        <div
          v-if="subscriptionsLoading"
          class="loading-state"
        >
          <div class="spinner" />
          <p>{{ $t('subscriptions.loading') }}</p>
        </div>

        <div
          v-else-if="filteredSubscriptions.length === 0"
          data-testid="subscriptions-empty-state"
          class="empty-state"
        >
          <p>{{ $t('subscriptions.noSubscriptionsForUser') }}</p>
        </div>

        <table
          v-else
          data-testid="user-subscriptions-table"
          class="data-table"
        >
          <thead>
            <tr>
              <th>{{ $t('subscriptions.plan') }}</th>
              <th>{{ $t('subscriptions.status') }}</th>
              <th>{{ $t('subscriptions.createdAt') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="subscription in filteredSubscriptions"
              :key="subscription.id"
              class="clickable-row"
              @click="navigateToSubscription(subscription.id)"
            >
              <td>{{ subscription.plan_name }}</td>
              <td>
                <span
                  class="status-badge"
                  :class="subscription.status.toLowerCase()"
                >
                  {{ formatStatus(subscription.status) }}
                </span>
              </td>
              <td>{{ formatDate(subscription.created_at) }}</td>
            </tr>
          </tbody>
        </table>

        <div
          v-if="subscriptionsTotalPages > 1"
          data-testid="subscriptions-pagination"
          class="pagination"
        >
          <button
            :disabled="subscriptionsPage === 1"
            class="pagination-btn"
            @click="changeSubscriptionsPage(subscriptionsPage - 1)"
          >
            {{ $t('common.previous') }}
          </button>
          <span class="pagination-info">
            {{ $t('common.page') }} {{ subscriptionsPage }} {{ $t('common.of') }} {{ subscriptionsTotalPages }}
          </span>
          <button
            :disabled="subscriptionsPage >= subscriptionsTotalPages"
            class="pagination-btn"
            @click="changeSubscriptionsPage(subscriptionsPage + 1)"
          >
            {{ $t('common.next') }}
          </button>
        </div>
      </div>

      <!-- Invoices Tab Content -->
      <div
        v-show="activeTab === 'invoices'"
        data-testid="tab-content-invoices"
        class="tab-content"
      >
        <div class="tab-filters">
          <input
            v-model="invoiceSearch"
            type="text"
            data-testid="invoices-search-input"
            :placeholder="$t('invoices.searchPlaceholder')"
            class="search-input"
          >
        </div>

        <div
          v-if="invoicesLoading"
          class="loading-state"
        >
          <div class="spinner" />
          <p>{{ $t('invoices.loading') }}</p>
        </div>

        <div
          v-else-if="filteredInvoices.length === 0"
          data-testid="invoices-empty-state"
          class="empty-state"
        >
          <p>{{ $t('invoices.noInvoicesForUser') }}</p>
        </div>

        <table
          v-else
          data-testid="user-invoices-table"
          class="data-table"
        >
          <thead>
            <tr>
              <th>{{ $t('invoices.invoiceNumber') }}</th>
              <th>{{ $t('invoices.amount') }}</th>
              <th>{{ $t('invoices.status') }}</th>
              <th>{{ $t('invoices.date') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="invoice in filteredInvoices"
              :key="invoice.id"
              class="clickable-row"
              @click="navigateToInvoice(invoice.id)"
            >
              <td>{{ invoice.invoice_number }}</td>
              <td>{{ formatAmount(invoice.amount, invoice.currency) }}</td>
              <td>
                <span
                  class="status-badge"
                  :class="invoice.status.toLowerCase()"
                >
                  {{ formatInvoiceStatus(invoice.status) }}
                </span>
              </td>
              <td>{{ formatDate(invoice.created_at) }}</td>
            </tr>
          </tbody>
        </table>

        <div
          v-if="invoicesTotalPages > 1"
          data-testid="invoices-pagination"
          class="pagination"
        >
          <button
            :disabled="invoicesPage === 1"
            class="pagination-btn"
            @click="changeInvoicesPage(invoicesPage - 1)"
          >
            {{ $t('common.previous') }}
          </button>
          <span class="pagination-info">
            {{ $t('common.page') }} {{ invoicesPage }} {{ $t('common.of') }} {{ invoicesTotalPages }}
          </span>
          <button
            :disabled="invoicesPage >= invoicesTotalPages"
            class="pagination-btn"
            @click="changeInvoicesPage(invoicesPage + 1)"
          >
            {{ $t('common.next') }}
          </button>
        </div>
      </div>

      <!-- Addons Tab Content -->
      <div
        v-show="activeTab === 'addons'"
        data-testid="tab-content-addons"
        class="tab-content"
      >
        <div class="tab-filters">
          <input
            v-model="addonSearch"
            type="text"
            data-testid="addons-search-input"
            :placeholder="$t('common.search')"
            class="search-input"
          >
        </div>

        <div
          v-if="addonsLoading"
          class="loading-state"
        >
          <div class="spinner" />
          <p>{{ $t('common.loading') }}</p>
        </div>

        <div
          v-else-if="filteredAddons.length === 0"
          data-testid="addons-empty-state"
          class="empty-state"
        >
          <p>{{ $t('users.noAddonsForUser') }}</p>
        </div>

        <table
          v-else
          data-testid="user-addons-table"
          class="data-table"
        >
          <thead>
            <tr>
              <th>{{ $t('users.addonName') }}</th>
              <th>{{ $t('users.paymentStatus') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th>{{ $t('users.firstInvoice') }}</th>
              <th>{{ $t('users.lastInvoice') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="addon in filteredAddons"
              :key="addon.id"
            >
              <td>{{ addon.addon_name }}</td>
              <td>
                <span
                  v-if="addon.invoice_status"
                  class="status-badge"
                  :class="addon.invoice_status"
                >
                  {{ formatInvoiceStatus(addon.invoice_status) }}
                </span>
                <span v-else>-</span>
              </td>
              <td>
                <span
                  class="status-badge"
                  :class="addon.status.toLowerCase()"
                >
                  {{ formatStatus(addon.status) }}
                </span>
              </td>
              <td>
                <a
                  v-if="addon.first_invoice"
                  class="invoice-link"
                  data-testid="first-invoice-link"
                  @click="navigateToInvoice(addon.first_invoice.id)"
                >
                  {{ formatDate(addon.first_invoice.created_at) }}
                </a>
                <span v-else>-</span>
              </td>
              <td>
                <a
                  v-if="addon.last_invoice"
                  class="invoice-link"
                  data-testid="last-invoice-link"
                  @click="navigateToInvoice(addon.last_invoice.id)"
                >
                  {{ formatDate(addon.last_invoice.created_at) }}
                </a>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useUsersStore } from '@/stores/users';
import { useSubscriptionsStore, type Subscription } from '@/stores/subscriptions';
import { useInvoicesStore, type Invoice } from '@/stores/invoices';
import { useAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';
import { api } from '@/api';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const usersStore = useUsersStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('users.manage'));
const subscriptionsStore = useSubscriptionsStore();
const invoicesStore = useInvoicesStore();

// Tab state
const activeTab = ref<'account' | 'subscriptions' | 'invoices' | 'addons'>('account');

// User form state
const loadingUser = ref(true);
const loadError = ref<string | null>(null);
const validationError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const submitting = ref(false);

interface FormData {
  email: string;
  is_active: boolean;
  first_name: string;
  last_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  postal_code: string;
  country: string;
  company: string;
  tax_number: string;
  new_password: string;
  token_balance: string;
}

const formData = ref<FormData>({
  email: '',
  is_active: true,
  first_name: '',
  last_name: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  postal_code: '',
  country: '',
  company: '',
  tax_number: '',
  new_password: '',
  token_balance: '0',
});

// Role is handled separately as a single value
const selectedRole = ref<string>('user');
const originalRole = ref<string>('user');

// RBAC roles
interface RbacRole {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
  is_admin: boolean;
}
const availableRoles = ref<RbacRole[]>([]);
const assignedRoleIds = reactive(new Set<string>());

interface UserLevel {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
  linked_plan_slug: string | null;
}
const availableUserLevels = ref<UserLevel[]>([]);
const assignedUserLevelIds = reactive(new Set<string>());

async function loadRoles() {
  try {
    const res = await api.get('/admin/access/levels') as { levels: RbacRole[] };
    availableRoles.value = res.levels;
  } catch {
    // Access API may not be available
  }
}

async function loadUserLevels() {
  try {
    const res = await api.get('/admin/access/user-levels') as { levels: UserLevel[] };
    availableUserLevels.value = res.levels;
  } catch {
    // User access levels API may not be available
  }
}

function toggleRole(roleId: string) {
  if (assignedRoleIds.has(roleId)) {
    assignedRoleIds.delete(roleId);
    api.delete(`/admin/access/users/${userId}/roles/${roleId}`).catch(() => {});
  } else {
    assignedRoleIds.add(roleId);
    api.post(`/admin/access/users/${userId}/roles`, { role_id: roleId }).catch(() => {});
  }
}

function toggleUserLevel(levelId: string) {
  if (assignedUserLevelIds.has(levelId)) {
    assignedUserLevelIds.delete(levelId);
    api.delete(`/admin/access/users/${userId}/user-access-levels/${levelId}`).catch(() => {});
  } else {
    assignedUserLevelIds.add(levelId);
    api.post(`/admin/access/users/${userId}/user-access-levels`, { level_id: levelId }).catch(() => {});
  }
}

const userId = route.params.id as string;

// Plugin extensions
const pluginSections = computed(() => extensionRegistry.getUserDetailsSections());

// Subscriptions state
const subscriptionsLoading = ref(false);
const userSubscriptions = ref<Subscription[]>([]);
const subscriptionsTotal = ref(0);
const subscriptionsPage = ref(1);
const subscriptionSearch = ref('');
const subscriptionsPerPage = 10;

// Invoices state
const invoicesLoading = ref(false);
const userInvoices = ref<Invoice[]>([]);
const invoicesTotal = ref(0);
const invoicesPage = ref(1);
const invoiceSearch = ref('');
const invoicesPerPage = 10;

// Addons state
interface AddonInvoice {
  id: string;
  invoice_number: string;
  created_at: string | null;
}
interface UserAddonSub {
  id: string;
  addon_name: string;
  status: string;
  invoice_status: string | null;
  first_invoice: AddonInvoice | null;
  last_invoice: AddonInvoice | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string | null;
}
const addonsLoading = ref(false);
const userAddonSubs = ref<UserAddonSub[]>([]);
const addonSearch = ref('');

// Computed
const subscriptionsTotalPages = computed(() =>
  Math.ceil(subscriptionsTotal.value / subscriptionsPerPage)
);
const invoicesTotalPages = computed(() =>
  Math.ceil(invoicesTotal.value / invoicesPerPage)
);

const filteredSubscriptions = computed(() => {
  if (!subscriptionSearch.value.trim()) {
    return userSubscriptions.value;
  }
  const query = subscriptionSearch.value.toLowerCase();
  return userSubscriptions.value.filter(sub =>
    sub.plan_name?.toLowerCase().includes(query) ||
    sub.status?.toLowerCase().includes(query)
  );
});

const filteredInvoices = computed(() => {
  if (!invoiceSearch.value.trim()) {
    return userInvoices.value;
  }
  const query = invoiceSearch.value.toLowerCase();
  return userInvoices.value.filter(inv =>
    inv.invoice_number?.toLowerCase().includes(query) ||
    inv.status?.toLowerCase().includes(query)
  );
});

const filteredAddons = computed(() => {
  if (!addonSearch.value.trim()) {
    return userAddonSubs.value;
  }
  const query = addonSearch.value.toLowerCase();
  return userAddonSubs.value.filter(a =>
    a.addon_name?.toLowerCase().includes(query) ||
    a.status?.toLowerCase().includes(query)
  );
});

// Methods
async function fetchUser(): Promise<void> {
  loadingUser.value = true;
  loadError.value = null;

  try {
    const user = await usersStore.fetchUser(userId);

    // Handle role - use the enum role string directly
    const userRole = user.role || 'USER';

    // Store original role to detect changes later
    originalRole.value = userRole;
    selectedRole.value = userRole;

    // Load RBAC access level assignments (admin)
    const userAccessLevels = Array.isArray(user.access_levels) ? user.access_levels : [];
    const userAccessLevelSlugs = userAccessLevels.map(level => level.slug);
    if (availableRoles.value.length > 0) {
      for (const role of availableRoles.value) {
        if (userAccessLevelSlugs.includes(role.slug)) {
          assignedRoleIds.add(role.id);
        }
      }
    }

    // Load user access level assignments
    const userUserLevels = Array.isArray(user.user_access_levels) ? user.user_access_levels : [];
    const userUserLevelSlugs = userUserLevels.map((level: { slug: string }) => level.slug);
    if (availableUserLevels.value.length > 0) {
      for (const level of availableUserLevels.value) {
        if (userUserLevelSlugs.includes(level.slug)) {
          assignedUserLevelIds.add(level.id);
        }
      }
    }

    // Get details and token balance
    const details = (user as unknown as { details?: Record<string, unknown> }).details || {};
    const tokenBalance = (user as unknown as { token_balance?: number }).token_balance ?? 0;

    formData.value = {
      email: user.email,
      is_active: user.is_active,
      first_name: (details.first_name as string) || extractName(user.name, 'first'),
      last_name: (details.last_name as string) || extractName(user.name, 'last'),
      phone: (details.phone as string) || '',
      address_line_1: (details.address_line_1 as string) || '',
      address_line_2: (details.address_line_2 as string) || '',
      city: (details.city as string) || '',
      postal_code: (details.postal_code as string) || '',
      country: (details.country as string) || '',
      company: (details.company as string) || '',
      tax_number: (details.tax_number as string) || '',
      new_password: '',
      token_balance: String(tokenBalance),
    };
  } catch (error) {
    loadError.value = (error as Error).message || t('users.loadFailed');
  } finally {
    loadingUser.value = false;
  }
}

function extractName(fullName: string | undefined, part: 'first' | 'last'): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (part === 'first') return parts[0] || '';
  return parts.slice(1).join(' ') || '';
}

function validateForm(): boolean {
  validationError.value = null;

  if (!selectedRole.value) {
    validationError.value = t('users.validation.roleRequired');
    return false;
  }

  // Password validation: if provided, must be at least 8 characters
  if (formData.value.new_password && formData.value.new_password.length < 8) {
    validationError.value = t('users.passwordMinLength');
    return false;
  }

  return true;
}

async function handleSubmit(): Promise<void> {
  if (!validateForm()) return;

  submitError.value = null;
  submitting.value = true;

  try {
    // Build update payload with individual detail fields
    const updatePayload: Record<string, unknown> = {
      is_active: formData.value.is_active,
      first_name: formData.value.first_name,
      last_name: formData.value.last_name,
      phone: formData.value.phone,
      address_line_1: formData.value.address_line_1,
      address_line_2: formData.value.address_line_2,
      city: formData.value.city,
      postal_code: formData.value.postal_code,
      country: formData.value.country,
      company: formData.value.company,
      tax_number: formData.value.tax_number,
    };

    if (formData.value.new_password) {
      updatePayload.password = formData.value.new_password;
    }

    // Parse token balance as integer
    const tokenValue = parseInt(formData.value.token_balance, 10);
    if (!isNaN(tokenValue)) {
      updatePayload.token_balance = tokenValue;
    }

    await usersStore.updateUser(userId, updatePayload);

    // Update access levels separately if changed
    if (originalRole.value !== selectedRole.value) {
      await usersStore.updateUserAccessLevels(userId, [selectedRole.value]);
    }

    router.push('/admin/users');
  } catch (error) {
    submitError.value = (error as Error).message || t('users.updateFailed');
  } finally {
    submitting.value = false;
  }
}

function goBack(): void {
  router.push('/admin/users');
}

// Tab switching with data loading
async function switchToSubscriptions(): Promise<void> {
  activeTab.value = 'subscriptions';
  if (userSubscriptions.value.length === 0) {
    await fetchUserSubscriptions();
  }
}

async function switchToInvoices(): Promise<void> {
  activeTab.value = 'invoices';
  if (userInvoices.value.length === 0) {
    await fetchUserInvoices();
  }
}

async function switchToAddons(): Promise<void> {
  activeTab.value = 'addons';
  if (userAddonSubs.value.length === 0) {
    await fetchUserAddons();
  }
}

async function fetchUserAddons(): Promise<void> {
  addonsLoading.value = true;
  try {
    const response = await api.get(`/admin/users/${userId}/addons`) as { addon_subscriptions: UserAddonSub[] };
    userAddonSubs.value = response.addon_subscriptions || [];
  } catch {
    // Error handled silently
  } finally {
    addonsLoading.value = false;
  }
}

async function fetchUserSubscriptions(): Promise<void> {
  subscriptionsLoading.value = true;
  try {
    const response = await subscriptionsStore.fetchSubscriptions({
      page: subscriptionsPage.value,
      per_page: subscriptionsPerPage,
      user_id: userId
    });
    userSubscriptions.value = response.subscriptions;
    subscriptionsTotal.value = response.total;
  } catch {
    // Error handled in store
  } finally {
    subscriptionsLoading.value = false;
  }
}

async function fetchUserInvoices(): Promise<void> {
  invoicesLoading.value = true;
  try {
    const response = await invoicesStore.fetchInvoices({
      page: invoicesPage.value,
      per_page: invoicesPerPage,
      user_id: userId
    });
    userInvoices.value = response.invoices;
    invoicesTotal.value = response.total;
  } catch {
    // Error handled in store
  } finally {
    invoicesLoading.value = false;
  }
}

function changeSubscriptionsPage(page: number): void {
  subscriptionsPage.value = page;
  fetchUserSubscriptions();
}

function changeInvoicesPage(page: number): void {
  invoicesPage.value = page;
  fetchUserInvoices();
}

function navigateToSubscription(subscriptionId: string): void {
  router.push(`/admin/subscriptions/${subscriptionId}`);
}

function navigateToInvoice(invoiceId: string): void {
  router.push(`/admin/invoices/${invoiceId}`);
}

function formatStatus(status: string): string {
  const statusKey = `subscriptions.statuses.${status}`;
  const translated = t(statusKey);
  // If translation key not found, return original status
  return translated === statusKey ? status : translated;
}

function formatInvoiceStatus(status: string): string {
  const statusKey = `invoices.statuses.${status}`;
  const translated = t(statusKey);
  // If translation key not found, return original status
  return translated === statusKey ? status : translated;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}

function formatAmount(amount: number, currency?: string): string {
  const currencyCode = currency || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(amount);
}

onMounted(() => {
  fetchUser();
  loadRoles();
  loadUserLevels();
});
</script>

<style scoped>
.user-edit-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.form-header {
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
.error-state,
.empty-state {
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

/* Tabs */
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
  padding: 20px 0;
}

/* Form styles */
.user-form h2 {
  margin: 0 0 25px 0;
  color: #2c3e50;
}

.form-section {
  margin-bottom: 30px;
}

.form-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.validation-error,
.submit-error {
  background: #f8d7da;
  color: #721c24;
  padding: 12px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 15px;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus {
  border-color: #3498db;
  outline: none;
}

.form-input.readonly {
  background: #f5f5f5;
  color: #666;
}

.balance-input {
  max-width: 200px;
  font-family: monospace;
}

.help-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.cancel-btn {
  padding: 10px 20px;
  background: #e9ecef;
  color: #495057;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: #dee2e6;
}

.submit-btn {
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.submit-btn:hover:not(:disabled) {
  background: #2980b9;
}

.submit-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

/* Tab content styles */
.tab-filters {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  max-width: 300px;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

/* Data table */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.clickable-row:hover {
  background-color: #f8f9fa;
}

/* Status badges */
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.active,
.status-badge.paid {
  background: #d4edda;
  color: #155724;
}

.status-badge.cancelled,
.status-badge.failed {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.past_due,
.status-badge.refunded {
  background: #fff3cd;
  color: #856404;
}

.status-badge.trialing,
.status-badge.pending {
  background: #cce5ff;
  color: #004085;
}

.status-badge.paused,
.status-badge.expired {
  background: #e9ecef;
  color: #495057;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.pagination-btn {
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.pagination-btn:hover:not(:disabled) {
  background: #2980b9;
}

.pagination-info {
  color: #666;
  font-size: 0.9rem;
}

.invoice-link {
  color: #3498db;
  cursor: pointer;
  text-decoration: none;
}

.invoice-link:hover {
  text-decoration: underline;
}

.role-display {
  display: inline-block;
  padding: 4px 10px;
  background: #e9ecef;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
}
.role-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.role-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.role-checkbox:hover {
  background: #f9fafb;
}
.role-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  background: #cce5ff;
  color: #004085;
}
.role-badge--plan {
  background: #d4edda;
  color: #155724;
}
</style>
