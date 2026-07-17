<template>
  <div
    data-testid="license-content"
    class="license-tab"
  >
    <div class="tab-toolbar">
      <div>
        <h3>{{ $t('license.title') }}</h3>
        <p class="section-description">
          {{ $t('license.description') }}
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading && !status"
      data-testid="license-loading"
      class="license-loading"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>

    <!-- Fetch error -->
    <div
      v-else-if="fetchError"
      data-testid="license-error"
      class="license-error"
    >
      <p>{{ fetchError }}</p>
      <button
        class="retry-btn"
        @click="load"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <template v-else-if="status">
      <!-- Degraded banner: required but nothing covering -->
      <div
        v-if="status.degraded"
        data-testid="license-degraded-banner"
        class="license-banner license-banner--danger"
      >
        {{ $t('license.degradedBanner') }}
      </div>

      <!-- Add/remove feedback message -->
      <div
        v-if="message"
        data-testid="license-message"
        class="license-banner"
        :class="messageIsError ? 'license-banner--danger' : 'license-banner--success'"
      >
        {{ message }}
      </div>

      <!-- Status card -->
      <div
        data-testid="license-status-card"
        class="license-status-card"
      >
        <div class="status-line">
          <span class="status-label">{{ $t('license.edition') }}</span>
          <span class="status-value">{{ status.edition || $t('license.noEdition') }}</span>
        </div>
        <div class="status-line">
          <span class="status-label">{{ $t('license.overall') }}</span>
          <span
            data-testid="license-overall-badge"
            class="status-badge"
            :class="`status-badge--${overallStatus}`"
          >
            {{ $t(`license.status.${overallStatus}`) }}
          </span>
        </div>
        <div class="status-line">
          <span class="status-label">{{ $t('license.seats') }}</span>
          <span
            data-testid="license-seats"
            class="status-value"
          >
            {{ formatValue(status.seats.used) }} / {{ formatValue(status.seats.limit) }}
          </span>
        </div>
      </div>

      <!-- Resource usage -->
      <div class="license-section">
        <h4>{{ $t('license.resourceUsage') }}</h4>
        <table
          v-if="resources.length > 0"
          data-testid="license-resources-table"
          class="license-table"
        >
          <thead>
            <tr>
              <th>{{ $t('license.resource') }}</th>
              <th>{{ $t('license.used') }}</th>
              <th>{{ $t('license.limit') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="resource in resources"
              :key="resource.resource"
              data-testid="license-resource-row"
            >
              <td>{{ resource.resource }}</td>
              <td>{{ formatValue(resource.used) }}</td>
              <td>{{ formatValue(resource.limit) }}</td>
            </tr>
          </tbody>
        </table>
        <p
          v-else
          class="muted-note"
        >
          {{ $t('license.noResources') }}
        </p>
      </div>

      <!-- Keys table -->
      <div class="license-section">
        <h4>{{ $t('license.keys') }}</h4>

        <div
          v-if="keys.length === 0"
          data-testid="license-empty"
          class="empty-state"
        >
          <p>{{ $t('license.noKeys') }}</p>
          <p class="empty-hint">
            {{ $t('license.noKeysHint') }}
          </p>
        </div>

        <table
          v-else
          data-testid="license-keys-table"
          class="license-table"
        >
          <thead>
            <tr>
              <th>{{ $t('license.column.scope') }}</th>
              <th>{{ $t('license.column.keyId') }}</th>
              <th>{{ $t('license.column.status') }}</th>
              <th>{{ $t('license.column.expires') }}</th>
              <th>{{ $t('license.column.seats') }}</th>
              <th v-if="canManage">
                {{ $t('common.actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="key in keys"
              :key="key.key_id"
              :data-testid="`license-key-row-${key.key_id}`"
            >
              <td>{{ key.scope.join(', ') }}</td>
              <td class="key-id-cell">
                {{ key.key_id }}
              </td>
              <td>
                <span
                  :data-testid="`license-key-status-${key.key_id}`"
                  class="status-badge"
                  :class="`status-badge--${key.status.toLowerCase()}`"
                >
                  {{ key.status }}
                </span>
              </td>
              <td>{{ formatDate(key.expires_at) }}</td>
              <td>{{ formatValue(key.seat_limit) }}</td>
              <td v-if="canManage">
                <button
                  class="action-btn delete-btn"
                  :data-testid="`license-remove-${key.key_id}`"
                  @click="handleRemove(key.key_id)"
                >
                  {{ $t('common.remove') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add key -->
      <div
        v-if="canManage"
        class="license-section"
      >
        <h4>{{ $t('license.addKey') }}</h4>
        <div class="add-key-grid">
          <div class="add-key-block">
            <label for="license-code">{{ $t('license.activateWithCode') }}</label>
            <p class="field-help">
              {{ $t('license.activateWithCodeHelp') }}
            </p>
            <input
              id="license-code"
              v-model="codeInput"
              data-testid="license-code-input"
              type="text"
              class="form-input"
              :placeholder="$t('license.codePlaceholder')"
            >
            <button
              class="action-btn activate-btn"
              data-testid="license-code-submit"
              :disabled="submitting || codeInput.trim() === ''"
              @click="handleActivateCode"
            >
              {{ $t('license.activate') }}
            </button>
          </div>

          <div class="add-key-block">
            <label for="license-envelope">{{ $t('license.pasteFile') }}</label>
            <p class="field-help">
              {{ $t('license.pasteFileHelp') }}
            </p>
            <textarea
              id="license-envelope"
              v-model="envelopeInput"
              data-testid="license-envelope-input"
              class="form-textarea"
              rows="4"
              :placeholder="$t('license.envelopePlaceholder')"
            />
            <button
              class="action-btn activate-btn"
              data-testid="license-envelope-submit"
              :disabled="submitting || envelopeInput.trim() === ''"
              @click="handleAddEnvelope"
            >
              {{ $t('license.addFile') }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLicenseStore } from '@/stores/license';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const licenseStore = useLicenseStore();
const authStore = useAuthStore();

const canManage = computed(() => authStore.hasPermission('license.manage'));

const status = computed(() => licenseStore.status);
const keys = computed(() => licenseStore.keys);
const resources = computed(() => licenseStore.resources);
const loading = computed(() => licenseStore.loading);
const fetchError = computed(() => licenseStore.error);

const codeInput = ref('');
const envelopeInput = ref('');
const submitting = ref(false);
const message = ref<string | null>(null);
const messageIsError = ref(false);

// Overall badge for the status card. Resolution lives in one place (DRY):
// degraded wins, then an inactive-but-configured license reads Expired, then a
// held GRACE key softens Active to Grace. Not configured (open CE) is neutral.
const overallStatus = computed<'active' | 'grace' | 'expired' | 'open'>(() => {
  const current = status.value;
  if (!current) return 'open';
  if (current.degraded) return 'expired';
  if (!current.active) return current.configured ? 'expired' : 'open';
  if (keys.value.some((key) => key.status?.toLowerCase() === 'grace')) return 'grace';
  return 'active';
});

function formatValue(value: number | null): string {
  return value === null || value === undefined ? '—' : String(value);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function showMessage(text: string, isError: boolean): void {
  message.value = text;
  messageIsError.value = isError;
}

async function load(): Promise<void> {
  try {
    await licenseStore.fetchStatus();
  } catch {
    // The store already captured the error message for the error state.
  }
}

async function handleActivateCode(): Promise<void> {
  const code = codeInput.value.trim();
  if (code === '') return;
  submitting.value = true;
  try {
    const result = await licenseStore.addByCode(code);
    codeInput.value = '';
    showMessage(t('license.addSuccess', { status: result.status }), false);
  } catch (error) {
    showMessage((error as Error).message || t('license.addError'), true);
  } finally {
    submitting.value = false;
  }
}

async function handleAddEnvelope(): Promise<void> {
  const envelope = envelopeInput.value.trim();
  if (envelope === '') return;
  submitting.value = true;
  try {
    const result = await licenseStore.addByEnvelope(envelope);
    envelopeInput.value = '';
    showMessage(t('license.addSuccess', { status: result.status }), false);
  } catch (error) {
    showMessage((error as Error).message || t('license.addError'), true);
  } finally {
    submitting.value = false;
  }
}

async function handleRemove(keyId: string): Promise<void> {
  if (!confirm(t('license.confirmRemove'))) return;
  try {
    await licenseStore.remove(keyId);
    showMessage(t('license.removed'), false);
  } catch (error) {
    showMessage((error as Error).message || t('license.removeError'), true);
  }
}

onMounted(load);
</script>

<style scoped>
.license-tab {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.section-description {
  color: var(--vbwd-color-text-muted, #6b7280);
  margin: 0.25rem 0 0;
}

.license-loading,
.license-error {
  text-align: center;
  padding: 2rem;
}

.license-banner {
  padding: 0.75rem 1rem;
  border-radius: var(--vbwd-radius-md, 8px);
}

.license-banner--danger {
  background: var(--vbwd-color-danger-soft, #fdecea);
  color: var(--vbwd-color-danger, #b91c1c);
}

.license-banner--success {
  background: var(--vbwd-color-success-soft, #eafaf1);
  color: var(--vbwd-color-success, #1e7e4f);
}

.license-status-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--vbwd-color-border, #e5e7eb);
  border-radius: var(--vbwd-radius-md, 8px);
}

.status-line {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.status-label {
  min-width: 8rem;
  color: var(--vbwd-color-text-muted, #6b7280);
}

.status-value {
  font-weight: 600;
}

.license-section h4 {
  margin: 0 0 0.75rem;
}

.license-table {
  width: 100%;
  border-collapse: collapse;
}

.license-table th,
.license-table td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--vbwd-color-border, #e5e7eb);
}

.key-id-cell {
  font-family: var(--vbwd-font-mono, monospace);
}

.status-badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--vbwd-color-border, #e5e7eb);
}

.status-badge--active,
.status-badge--valid {
  background: var(--vbwd-color-success-soft, #eafaf1);
  color: var(--vbwd-color-success, #1e7e4f);
}

.status-badge--grace {
  background: var(--vbwd-color-warning-soft, #fef6e7);
  color: var(--vbwd-color-warning, #a15c07);
}

.status-badge--expired,
.status-badge--invalid_signature,
.status-badge--wrong_instance,
.status-badge--missing {
  background: var(--vbwd-color-danger-soft, #fdecea);
  color: var(--vbwd-color-danger, #b91c1c);
}

.empty-state {
  padding: 1.5rem;
  text-align: center;
  border: 1px dashed var(--vbwd-color-border, #e5e7eb);
  border-radius: var(--vbwd-radius-md, 8px);
}

.empty-hint,
.field-help,
.muted-note {
  color: var(--vbwd-color-text-muted, #6b7280);
  font-size: 0.85rem;
}

.add-key-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1.5rem;
}

.add-key-block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--vbwd-color-border, #d1d5db);
  border-radius: var(--vbwd-radius-sm, 6px);
}

.action-btn {
  align-self: flex-start;
  padding: 0.4rem 0.9rem;
  border: none;
  border-radius: var(--vbwd-radius-sm, 6px);
  cursor: pointer;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.activate-btn {
  background: var(--vbwd-color-accent, #2563eb);
  color: var(--vbwd-color-on-accent, #ffffff);
}

.delete-btn {
  background: var(--vbwd-color-danger, #dc2626);
  color: var(--vbwd-color-on-accent, #ffffff);
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.4rem 0.9rem;
}
</style>
