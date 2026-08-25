<template>
  <div
    class="profile-view"
    data-testid="profile-view"
  >
    <div class="profile-header">
      <h2 data-testid="profile-title">
        {{ $t('profile.title') }}
      </h2>
    </div>

    <div
      v-if="loading"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>

    <div
      v-else-if="fetchError"
      data-testid="fetch-error"
      class="error-state"
    >
      <p>{{ fetchError }}</p>
      <button
        class="retry-btn"
        @click="fetchProfile"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <div
      v-else
      data-testid="profile-form"
      class="profile-form"
    >
      <div
        v-if="successMessage"
        data-testid="success-message"
        class="success-message"
      >
        {{ successMessage }}
      </div>

      <div
        v-if="saveError"
        data-testid="error-message"
        class="error-message"
      >
        {{ saveError }}
      </div>

      <!-- Personal Information -->
      <div class="form-section">
        <h3>{{ $t('profile.personalInfo') }}</h3>

        <div class="form-group">
          <label for="email">{{ $t('profile.email') }}</label>
          <input
            id="email"
            v-model="formData.email"
            data-testid="email-input"
            type="email"
            class="form-input readonly"
            readonly
            disabled
          >
          <small class="help-text">{{ $t('profile.emailReadonly') }}</small>
        </div>

        <div class="form-group">
          <label>{{ $t('profile.role') }}</label>
          <span
            class="role-badge"
            data-testid="role-badge"
          >
            {{ formData.role }}
          </span>
          <small class="help-text">{{ $t('profile.roleReadonly') }}</small>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="firstName">{{ $t('profile.firstName') }}</label>
            <input
              id="firstName"
              v-model="formData.first_name"
              data-testid="first-name-input"
              type="text"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label for="lastName">{{ $t('profile.lastName') }}</label>
            <input
              id="lastName"
              v-model="formData.last_name"
              data-testid="last-name-input"
              type="text"
              class="form-input"
            >
          </div>
        </div>
      </div>

      <!-- Company Information -->
      <div class="form-section">
        <h3>{{ $t('profile.companyInfo') }}</h3>

        <div class="form-group">
          <label for="company">{{ $t('profile.company') }}</label>
          <input
            id="company"
            v-model="formData.company"
            data-testid="company-input"
            type="text"
            class="form-input"
          >
        </div>

        <div class="form-group">
          <label for="taxNumber">{{ $t('profile.taxNumber') }}</label>
          <input
            id="taxNumber"
            v-model="formData.tax_number"
            data-testid="tax-number-input"
            type="text"
            class="form-input"
          >
        </div>

        <div class="form-group">
          <label for="phone">{{ $t('profile.phone') }}</label>
          <input
            id="phone"
            v-model="formData.phone"
            data-testid="phone-input"
            type="tel"
            class="form-input"
          >
        </div>
      </div>

      <!-- Address Information -->
      <div class="form-section">
        <h3>{{ $t('profile.addressInfo') }}</h3>

        <div class="form-group">
          <label for="addressLine1">{{ $t('profile.addressLine1') }}</label>
          <input
            id="addressLine1"
            v-model="formData.address_line_1"
            data-testid="address-line-1-input"
            type="text"
            class="form-input"
          >
        </div>

        <div class="form-group">
          <label for="addressLine2">{{ $t('profile.addressLine2') }}</label>
          <input
            id="addressLine2"
            v-model="formData.address_line_2"
            data-testid="address-line-2-input"
            type="text"
            class="form-input"
          >
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="city">{{ $t('profile.city') }}</label>
            <input
              id="city"
              v-model="formData.city"
              data-testid="city-input"
              type="text"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label for="postalCode">{{ $t('profile.postalCode') }}</label>
            <input
              id="postalCode"
              v-model="formData.postal_code"
              data-testid="postal-code-input"
              type="text"
              class="form-input"
            >
          </div>
        </div>

        <div class="form-group">
          <label for="state">{{ $t('profile.state') }}</label>
          <input
            id="state"
            v-model="formData.state"
            data-testid="state-input"
            type="text"
            class="form-input"
          >
        </div>

        <div class="form-group">
          <label for="country">{{ $t('profile.country') }}</label>
          <input
            id="country"
            v-model="formData.country"
            data-testid="country-input"
            type="text"
            maxlength="2"
            placeholder="DE"
            class="form-input"
          >
        </div>
      </div>

      <!-- Balance (readonly) -->
      <div class="form-section">
        <h3>{{ $t('profile.balance') }}</h3>
        <div
          class="balance-display"
          data-testid="balance-display"
        >
          <span class="balance-amount">{{ formatBalance(formData.balance) }}</span>
          <small class="help-text">{{ $t('profile.balanceReadonly') }}</small>
        </div>
      </div>

      <!-- Preferences -->
      <div class="form-section">
        <h3>{{ $t('profile.preferences') }}</h3>

        <div class="form-group">
          <label for="language">{{ $t('profile.language') }}</label>
          <select
            id="language"
            v-model="formData.language"
            data-testid="language-select"
            class="form-select"
            @change="onLanguageChange"
          >
            <option
              v-for="lang in availableLanguages"
              :key="lang.code"
              :value="lang.code"
            >
              {{ lang.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="button"
          data-testid="save-button"
          class="save-btn"
          :disabled="saving"
          @click="handleSave"
        >
          {{ saving ? $t('common.loading') : $t('profile.saveProfile') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '@/api';
import { setLocale, type LocaleCode } from '@/i18n';

interface ProfileData {
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  company: string;
  tax_number: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  balance: number;
  language: LocaleCode;
}

interface Language {
  code: string;
  name: string;
}

const { locale } = useI18n();

const loading = ref(true);
const saving = ref(false);
const fetchError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const availableLanguages = ref<Language[]>([]);

const formData = reactive<ProfileData>({
  email: '',
  role: '',
  first_name: '',
  last_name: '',
  company: '',
  tax_number: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  balance: 0,
  language: 'en',
});

async function fetchLanguages(): Promise<void> {
  try {
    const response = await api.get('/config/languages') as { languages: Language[]; default: string };
    availableLanguages.value = response.languages;
  } catch {
    // Fallback to all available languages
    availableLanguages.value = [
      { code: 'en', name: 'English' },
      { code: 'de', name: 'Deutsch' },
      { code: 'ru', name: 'Русский' },
      { code: 'th', name: 'ไทย' },
      { code: 'zh', name: '中文' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'ja', name: '日本語' },
    ];
  }
}

async function fetchProfile(): Promise<void> {
  loading.value = true;
  fetchError.value = null;

  try {
    const response = await api.get('/admin/profile') as { user: { email: string; role: string; details: Record<string, unknown> } };
    const user = response.user;
    const details = user.details || {};

    formData.email = user.email;
    formData.role = user.role;
    formData.first_name = (details.first_name as string) || '';
    formData.last_name = (details.last_name as string) || '';
    formData.company = (details.company as string) || '';
    formData.tax_number = (details.tax_number as string) || '';
    formData.phone = (details.phone as string) || '';
    formData.address_line_1 = (details.address_line_1 as string) || '';
    formData.address_line_2 = (details.address_line_2 as string) || '';
    formData.city = (details.city as string) || '';
    formData.state = (details.state as string) || '';
    formData.postal_code = (details.postal_code as string) || '';
    formData.country = (details.country as string) || '';
    formData.balance = (details.balance as number) || 0;

    // Set the language dropdown to show the current app locale
    // Don't override the app's locale here - it's already been set from localStorage/backend on app startup
    // Only change the locale when the user explicitly changes it via the dropdown
    formData.language = locale.value as LocaleCode;
  } catch (error) {
    fetchError.value = (error as Error).message || 'Failed to load profile';
  } finally {
    loading.value = false;
  }
}

function onLanguageChange(): void {
  // Update UI language immediately
  setLocale(formData.language);
  locale.value = formData.language;
}

async function handleSave(): Promise<void> {
  saving.value = true;
  saveError.value = null;
  successMessage.value = null;

  try {
    await api.put('/admin/profile', {
      first_name: formData.first_name,
      last_name: formData.last_name,
      company: formData.company,
      tax_number: formData.tax_number,
      phone: formData.phone,
      address_line_1: formData.address_line_1,
      address_line_2: formData.address_line_2,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postal_code,
      country: formData.country,
      config: {
        language: formData.language,
      },
    });

    // Update i18n locale
    setLocale(formData.language);
    locale.value = formData.language;

    successMessage.value = 'Profile saved successfully';
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (error) {
    saveError.value = (error as Error).message || 'Failed to save profile';
  } finally {
    saving.value = false;
  }
}

function formatBalance(balance: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance) + ' tokens';
}

onMounted(async () => {
  await fetchLanguages();
  await fetchProfile();
});
</script>

<style scoped>
.profile-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.profile-header {
  margin-bottom: 30px;
}

.profile-header h2 {
  margin: 0;
  color: #2c3e50;
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
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.profile-form {
  max-width: 700px;
}

.success-message {
  background: #d4edda;
  color: #155724;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.form-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.form-section h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 1rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3498db;
}

.form-input.readonly {
  background: #f5f5f5;
  color: #666;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.help-text {
  display: block;
  margin-top: 5px;
  font-size: 0.8rem;
  color: #888;
}

.role-badge {
  display: inline-block;
  padding: 6px 14px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  text-transform: capitalize;
}

.balance-display {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.balance-amount {
  font-size: 1.5rem;
  font-weight: 600;
  color: #28a745;
}

.form-actions {
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.save-btn {
  padding: 12px 30px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.save-btn:hover:not(:disabled) {
  background: #218838;
}

.save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
