<template>
  <div
    class="login-container"
    data-testid="login-view"
  >
    <div class="login-box">
      <h1>{{ $t('auth.login') }}</h1>
      <form
        data-testid="login-form"
        @submit.prevent="handleLogin"
      >
        <div class="form-group">
          <label for="username">{{ $t('auth.email') }}</label>
          <input
            id="username"
            v-model="username"
            type="email"
            required
            autocomplete="email"
            class="input"
            data-testid="username-input"
          >
        </div>
        <div class="form-group">
          <label for="password">{{ $t('auth.password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="input"
            data-testid="password-input"
          >
        </div>
        <p
          v-if="error"
          class="error"
          data-testid="login-error"
        >
          {{ error }}
        </p>
        <button
          type="submit"
          :disabled="loading"
          class="btn-primary"
          data-testid="login-button"
        >
          {{ loading ? $t('auth.loggingIn') : $t('auth.loginButton') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useRouter, useRoute } from 'vue-router';

const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin(): Promise<void> {
  error.value = '';
  loading.value = true;

  try {
    // Log before login
    if (typeof window !== 'undefined') {
      console.log('[LOGIN] Starting login...');
      (window as any).__LOGIN_DEBUG__ = { started: true, timestamp: new Date().toISOString() };
    }

    await authStore.login({ email: username.value, password: password.value });

    if (typeof window !== 'undefined') {
      console.log('[LOGIN] Login completed');
      (window as any).__LOGIN_DEBUG__ = {
        completed: true,
        hasToken: !!authStore.token,
        hasUser: !!authStore.user,
        isAdmin: authStore.isAdmin,
        timestamp: new Date().toISOString(),
      };
    }

    // Check if user has admin role
    if (!authStore.isAdmin) {
      console.log('[LOGIN] User is not admin, redirecting to forbidden');
      authStore.logout();
      router.push('/admin/forbidden');
      return;
    }

    // Honor ?redirect=<path> if the user was bounced here by a 401 — only
    // accept in-app /admin paths to avoid open-redirect into arbitrary URLs.
    const rawRedirect = Array.isArray(route.query.redirect)
      ? route.query.redirect[0]
      : route.query.redirect;
    const safeRedirect =
      typeof rawRedirect === 'string' && rawRedirect.startsWith('/admin/') && rawRedirect !== '/admin/login'
        ? rawRedirect
        : '/admin/dashboard';

    console.log('[LOGIN] Admin user confirmed, redirecting to', safeRedirect);
    router.push(safeRedirect);
  } catch (err) {
    console.error('[LOGIN] Error:', err);
    if (typeof window !== 'undefined') {
      (window as any).__LOGIN_ERROR__ = { error: String(err), timestamp: new Date().toISOString() };
    }
    error.value = t('auth.invalidCredentials');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #ccc;
}

.error {
  color: #dc3545;
  margin-bottom: 15px;
  text-align: center;
}
</style>
