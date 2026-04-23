<template>
  <div class="plugin-details-view">
    <div class="page-header">
      <router-link
        to="/admin/settings"
        class="back-link"
        data-testid="back-to-plugins"
      >
        &larr; {{ $t('adminPlugins.detail.backToPlugins') }}
      </router-link>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading-state"
      data-testid="plugin-loading"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="error-state"
      data-testid="plugin-error"
    >
      <p>{{ error }}</p>
      <button
        class="retry-btn"
        @click="loadPlugin"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <!-- Plugin Content -->
    <div
      v-else-if="plugin"
      class="plugin-content"
    >
      <!-- Plugin Header -->
      <div
        class="plugin-header"
        data-testid="plugin-header"
      >
        <div class="plugin-info">
          <h2 data-testid="plugin-name">
            {{ plugin.name }}
          </h2>
          <span class="plugin-version">v{{ plugin.version }}</span>
          <span
            class="status-badge"
            :class="{
              active: plugin.status === 'active',
              inactive: plugin.status === 'inactive',
              'status-error': plugin.status === 'error'
            }"
            data-testid="plugin-status"
          >
            {{ plugin.status === 'active' ? $t('adminPlugins.active') : plugin.status === 'inactive' ? $t('adminPlugins.inactive') : $t('adminPlugins.error') }}
          </span>
        </div>
        <p
          v-if="plugin.description"
          class="plugin-description"
          data-testid="plugin-description"
        >
          {{ plugin.description }}
        </p>
        <div
          v-if="canManage"
          class="plugin-actions"
        >
          <button
            v-if="plugin.status === 'active'"
            class="action-btn deactivate-btn"
            data-testid="deactivate-plugin-btn"
            @click="handleDeactivate"
          >
            {{ $t('adminPlugins.detail.deactivate') }}
          </button>
          <button
            v-else
            class="action-btn activate-btn"
            data-testid="activate-plugin-btn"
            @click="handleActivate"
          >
            {{ $t('adminPlugins.detail.activate') }}
          </button>
          <button
            class="action-btn delete-btn"
            data-testid="uninstall-plugin-btn"
            @click="handleUninstall"
          >
            {{ $t('adminPlugins.detail.uninstall') }}
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div
        v-if="successMessage"
        class="success-message"
        data-testid="success-message"
      >
        {{ successMessage }}
      </div>
      <div
        v-if="saveError"
        class="error-message"
        data-testid="error-message"
      >
        {{ saveError }}
      </div>

      <!-- Config Tabs -->
      <div
        v-if="plugin.adminConfig?.tabs?.length > 0"
        class="config-section"
      >
        <div
          class="config-tabs"
          data-testid="config-tabs"
        >
          <button
            v-for="tab in plugin.adminConfig.tabs"
            :key="tab.id"
            class="config-tab-btn"
            :class="{ active: activeConfigTab === tab.id }"
            :data-testid="`config-tab-${tab.id}`"
            @click="activeConfigTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="config-form">
          <div
            v-for="tab in plugin.adminConfig.tabs"
            v-show="activeConfigTab === tab.id"
            :key="tab.id"
            class="config-tab-content"
            :data-testid="`config-content-${tab.id}`"
          >
            <div
              v-for="field in tab.fields"
              :key="field.key"
              class="config-field"
              :data-testid="`config-field-${field.key}`"
            >
              <!-- Checkbox -->
              <label
                v-if="field.component === 'checkbox'"
                class="checkbox-label"
              >
                <input
                  type="checkbox"
                  :checked="!!configValues[field.key]"
                  :data-testid="`config-input-${field.key}`"
                  @change="configValues[field.key] = ($event.target as HTMLInputElement).checked"
                >
                <span>{{ field.label }}</span>
              </label>

              <!-- Input (text/number) -->
              <template v-else-if="field.component === 'input'">
                <label class="field-label">{{ field.label }}</label>
                <input
                  :type="field.inputType || 'text'"
                  :value="configValues[field.key]"
                  :min="field.min"
                  :max="field.max"
                  class="form-input"
                  :data-testid="`config-input-${field.key}`"
                  @input="configValues[field.key] = field.inputType === 'number' ? Number(($event.target as HTMLInputElement).value) : ($event.target as HTMLInputElement).value"
                >
              </template>

              <!-- Select -->
              <template v-else-if="field.component === 'select'">
                <label class="field-label">{{ field.label }}</label>
                <select
                  :value="configValues[field.key]"
                  class="form-select"
                  :data-testid="`config-input-${field.key}`"
                  @change="configValues[field.key] = ($event.target as HTMLSelectElement).value"
                >
                  <option
                    v-for="opt in field.options"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </template>

              <!-- Textarea -->
              <template v-else-if="field.component === 'textarea'">
                <label class="field-label">{{ field.label }}</label>
                <textarea
                  :value="configValues[field.key] as string"
                  class="form-textarea"
                  rows="3"
                  :data-testid="`config-input-${field.key}`"
                  @input="configValues[field.key] = ($event.target as HTMLTextAreaElement).value"
                />
              </template>

              <!-- Field description -->
              <p
                v-if="getFieldDescription(field.key)"
                class="field-description"
              >
                {{ getFieldDescription(field.key) }}
              </p>
            </div>
          </div>

          <div
            v-if="canManage"
            class="form-actions"
          >
            <button
              class="save-btn"
              :disabled="saving"
              data-testid="save-config-btn"
              @click="handleSaveConfig"
            >
              {{ saving ? $t('adminPlugins.detail.saving') : $t('adminPlugins.detail.saveConfig') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { usePluginsStore } from '@/stores/plugins';
import type { PluginDetail } from '@/stores/plugins';
import type { PluginRegistry } from 'vbwd-view-component';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const pluginsStore = usePluginsStore();
const canManage = computed(() => authStore.hasPermission('settings.system'));

const loading = ref(true);
const error = ref<string | null>(null);
const saving = ref(false);
const saveError = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const activeConfigTab = ref('');
const plugin = ref<PluginDetail | null>(null);
const configValues = reactive<Record<string, unknown>>({});

const pluginName = route.params.pluginName as string;
const pluginRegistry = inject<PluginRegistry>('pluginRegistry');

function getFieldDescription(key: string): string {
  if (!plugin.value?.configSchema?.[key]) return '';
  return plugin.value.configSchema[key].description || '';
}

function initConfigValues(): void {
  if (!plugin.value) return;

  // Start with defaults from configSchema
  const schema = plugin.value.configSchema || {};
  for (const [key, field] of Object.entries(schema)) {
    configValues[key] = field.default;
  }

  // Override with saved values
  const saved = plugin.value.savedConfig || {};
  for (const [key, value] of Object.entries(saved)) {
    configValues[key] = value;
  }

  // Set initial active tab
  if (plugin.value.adminConfig?.tabs?.length > 0) {
    activeConfigTab.value = plugin.value.adminConfig.tabs[0].id;
  }
}

async function loadPlugin(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const detail = await pluginsStore.fetchPluginDetail(pluginName);
    plugin.value = detail;
    initConfigValues();
  } catch (e) {
    error.value = (e as Error).message || 'Failed to load plugin';
  } finally {
    loading.value = false;
  }
}

async function handleSaveConfig(): Promise<void> {
  saving.value = true;
  saveError.value = null;
  successMessage.value = null;
  try {
    await pluginsStore.savePluginConfig(pluginName, { ...configValues });
    successMessage.value = t('adminPlugins.detail.configSaved');
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (e) {
    saveError.value = (e as Error).message || 'Failed to save config';
  } finally {
    saving.value = false;
  }
}

/**
 * Translate the raw PluginRegistry error into something the developer can act on.
 *
 * The core's "Plugin 'X' not found" error means the plugin module either
 * (a) failed to import at boot (JS/TS error in index.ts or a locale JSON),
 * or (b) has no default export and the named-export fallback picked a
 * non-plugin export. In either case the Settings page still shows the
 * toggle as ON because plugins.json hasn't changed — the mismatch is what
 * made the error confusing. Point the user at the browser console where
 * pluginLoader logs the real import error.
 */
function describePluginActionError(error: unknown, action: string): string {
  const message = (error as Error).message || '';
  if (/not found/i.test(message)) {
    return (
      `${message}. The plugin appears enabled in plugins.json but never ` +
      `registered with the core runtime — its module likely failed to ` +
      `import at page load. Check the browser console for a red ` +
      `"[PluginRegistry] Failed to load plugin '${pluginName}'" line, fix ` +
      `that error in the plugin source, then hard-refresh.`
    );
  }
  return message || `Failed to ${action} plugin`;
}

async function handleActivate(): Promise<void> {
  try {
    if (pluginRegistry) {
      await pluginRegistry.activate(pluginName);
    }
    await pluginsStore.activatePlugin(pluginName);
    if (plugin.value) {
      plugin.value.enabled = true;
      plugin.value.status = 'active';
    }
  } catch (e) {
    saveError.value = describePluginActionError(e, 'activate');
  }
}

async function handleDeactivate(): Promise<void> {
  if (!confirm(t('adminPlugins.detail.confirmDeactivate'))) return;
  try {
    if (pluginRegistry) {
      await pluginRegistry.deactivate(pluginName);
    }
    await pluginsStore.deactivatePlugin(pluginName);
    if (plugin.value) {
      plugin.value.enabled = false;
      plugin.value.status = 'inactive';
    }
  } catch (e) {
    saveError.value = describePluginActionError(e, 'deactivate');
  }
}

async function handleUninstall(): Promise<void> {
  if (!confirm(t('adminPlugins.detail.confirmUninstall'))) return;
  try {
    await pluginsStore.uninstallPlugin(pluginName);
    router.push('/admin/settings');
  } catch (e) {
    saveError.value = (e as Error).message || 'Failed to uninstall plugin';
  }
}

// Watch for route param changes (e.g. navigating between plugins)
watch(() => route.params.pluginName, (newName) => {
  if (newName && newName !== plugin.value?.name) {
    loadPlugin();
  }
});

onMounted(() => {
  loadPlugin();
});
</script>

<style scoped>
.plugin-details-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.page-header {
  margin-bottom: 20px;
}

.back-link {
  color: #3498db;
  text-decoration: none;
  font-size: 14px;
}

.back-link:hover {
  text-decoration: underline;
}

/* Loading/Error States */
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

/* Plugin Header */
.plugin-header {
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 20px;
}

.plugin-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.plugin-info h2 {
  margin: 0;
  color: #2c3e50;
}

.plugin-version {
  color: #6c757d;
  font-size: 14px;
  background: #e9ecef;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.plugin-description {
  color: #666;
  margin: 10px 0 0;
  font-size: 14px;
}

.plugin-actions {
  margin-top: 15px;
  display: flex;
  gap: 8px;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #e9ecef;
  color: #666;
}

.status-badge.status-error {
  background: #f8d7da;
  color: #721c24;
}

/* Action Buttons */
.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  text-decoration: none;
}

.action-btn.activate-btn {
  background: #e8f5e9;
  color: #388e3c;
}

.action-btn.activate-btn:hover {
  background: #c8e6c9;
}

.action-btn.deactivate-btn {
  background: #fff3e0;
  color: #f57c00;
}

.action-btn.deactivate-btn:hover {
  background: #ffe0b2;
}

.action-btn.delete-btn {
  background: #ffebee;
  color: #d32f2f;
}

.action-btn.delete-btn:hover {
  background: #ffcdd2;
}

/* Messages */
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

/* Config Section */
.config-section {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.config-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e9ecef;
  background: #f8f9fa;
}

.config-tab-btn {
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

.config-tab-btn:hover {
  color: #3498db;
}

.config-tab-btn.active {
  color: #3498db;
  border-bottom-color: #3498db;
  background: white;
}

.config-form {
  padding: 20px;
}

.config-tab-content {
  max-width: 600px;
}

.config-field {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.field-description {
  margin: 4px 0 0;
  font-size: 12px;
  color: #999;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3498db;
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
