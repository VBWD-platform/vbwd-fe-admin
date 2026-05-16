<template>
  <div
    class="user-create-view"
    data-testid="user-create-view"
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

    <form
      data-testid="user-form"
      class="user-form"
      @submit.prevent="handleSubmit"
    >
      <h2 data-testid="form-title">
        {{ $t('users.createUser') }}
      </h2>

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
          <label for="email">{{ $t('users.email') }} *</label>
          <input
            id="email"
            v-model="formData.email"
            name="email"
            type="email"
            placeholder="user@example.com"
            class="form-input"
            required
          >
        </div>

        <div class="form-group">
          <label for="password">{{ $t('auth.password') }} *</label>
          <input
            id="password"
            v-model="formData.password"
            name="password"
            type="password"
            :placeholder="$t('users.passwordMinLength')"
            class="form-input"
            minlength="8"
            required
          >
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="status">{{ $t('users.status') }}</label>
            <select
              id="status"
              v-model="formData.status"
              name="status"
              class="form-select"
            >
              <option value="active">
                {{ $t('users.active') }}
              </option>
              <option value="pending">
                {{ $t('subscriptions.statuses.pending') }}
              </option>
              <option value="suspended">
                {{ $t('users.suspended') }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="role">{{ $t('users.role') }}</label>
            <select
              id="role"
              v-model="formData.role"
              name="role"
              class="form-select"
            >
              <option value="USER">
                {{ $t('users.roles.user') }}
              </option>
              <option value="ADMIN">
                {{ $t('users.roles.admin') }}
              </option>
              <option value="VENDOR">
                {{ $t('users.roles.vendor') }}
              </option>
              <option value="SUPER_ADMIN">
                {{ $t('users.roles.superAdmin') }}
              </option>
            </select>
          </div>
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
              v-model="formData.details.first_name"
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
              v-model="formData.details.last_name"
              name="lastName"
              type="text"
              placeholder="Doe"
              class="form-input"
            >
          </div>
        </div>

        <div class="form-group">
          <label for="addressLine1">{{ $t('profile.addressLine1') }}</label>
          <input
            id="addressLine1"
            v-model="formData.details.address_line_1"
            name="addressLine1"
            type="text"
            placeholder="123 Main Street"
            class="form-input"
          >
        </div>

        <div class="form-group">
          <label for="addressLine2">{{ $t('profile.addressLine2') }}</label>
          <input
            id="addressLine2"
            v-model="formData.details.address_line_2"
            name="addressLine2"
            type="text"
            placeholder="Apt 4B"
            class="form-input"
          >
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="city">{{ $t('profile.city') }}</label>
            <input
              id="city"
              v-model="formData.details.city"
              name="city"
              type="text"
              placeholder="Berlin"
              class="form-input"
            >
          </div>

          <div class="form-group">
            <label for="postalCode">{{ $t('profile.postalCode') }}</label>
            <input
              id="postalCode"
              v-model="formData.details.postal_code"
              name="postalCode"
              type="text"
              placeholder="10115"
              class="form-input"
            >
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="country">{{ $t('profile.country') }}</label>
            <select
              id="country"
              v-model="formData.details.country"
              name="country"
              class="form-select"
            >
              <option value="">
                {{ $t('users.selectCountry') }}
              </option>
              <option value="DE">
                {{ $t('countries.germany') }}
              </option>
              <option value="AT">
                {{ $t('countries.austria') }}
              </option>
              <option value="CH">
                {{ $t('countries.switzerland') }}
              </option>
              <option value="US">
                {{ $t('countries.unitedStates') }}
              </option>
              <option value="GB">
                {{ $t('countries.unitedKingdom') }}
              </option>
              <option value="FR">
                {{ $t('countries.france') }}
              </option>
              <option value="NL">
                {{ $t('countries.netherlands') }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="phone">{{ $t('profile.phone') }}</label>
            <input
              id="phone"
              v-model="formData.details.phone"
              name="phone"
              type="tel"
              placeholder="+49 30 12345678"
              class="form-input"
            >
          </div>
        </div>
      </section>

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
          {{ submitting ? $t('users.creating') : $t('users.createUser') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useUsersStore, type CreateUserData } from '@/stores/users';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const usersStore = useUsersStore();
const { t } = useI18n();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('users.manage'));

const validationError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const submitting = ref(false);

interface FormDetails {
  first_name: string;
  last_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
}

interface FormData {
  email: string;
  password: string;
  status: string;
  role: string;
  details: FormDetails;
}

const formData = ref<FormData>({
  email: '',
  password: '',
  status: 'active',
  role: 'USER',
  details: {
    first_name: '',
    last_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    postal_code: '',
    country: '',
    phone: '',
  },
});

function validateForm(): boolean {
  validationError.value = null;

  if (!formData.value.email.trim()) {
    validationError.value = t('users.validation.emailRequired');
    return false;
  }

  if (!formData.value.email.includes('@')) {
    validationError.value = t('users.validation.emailInvalid');
    return false;
  }

  if (!formData.value.password) {
    validationError.value = t('users.validation.passwordRequired');
    return false;
  }

  if (formData.value.password.length < 8) {
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
    // Clean up empty details fields
    const details = formData.value.details;
    const hasDetails = Object.values(details).some(v => v && v.trim());

    // Backend enums (UserStatus/UserRole) are canonically UPPERCASE.
    // Send the canonical casing so the wire contract is explicit and
    // independent of the dropdown's option casing.
    const data: CreateUserData = {
      email: formData.value.email,
      password: formData.value.password,
      status: formData.value.status.toUpperCase(),
      role: formData.value.role.toUpperCase(),
    };

    if (hasDetails) {
      data.details = {};
      if (details.first_name.trim()) data.details.first_name = details.first_name.trim();
      if (details.last_name.trim()) data.details.last_name = details.last_name.trim();
      if (details.address_line_1.trim()) data.details.address_line_1 = details.address_line_1.trim();
      if (details.address_line_2.trim()) data.details.address_line_2 = details.address_line_2.trim();
      if (details.city.trim()) data.details.city = details.city.trim();
      if (details.postal_code.trim()) data.details.postal_code = details.postal_code.trim();
      if (details.country.trim()) data.details.country = details.country.trim();
      if (details.phone.trim()) data.details.phone = details.phone.trim();
    }

    const user = await usersStore.createUser(data);
    router.push(`/admin/users/${user.id}`);
  } catch (error) {
    submitError.value = (error as Error).message || t('users.createFailed');
  } finally {
    submitting.value = false;
  }
}

function goBack(): void {
  router.push('/admin/users');
}
</script>

<style scoped>
.user-create-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 700px;
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
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.submit-btn:hover:not(:disabled) {
  background: #1e8449;
}

.submit-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}
</style>
