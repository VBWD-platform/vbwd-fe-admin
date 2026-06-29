<template>
  <div
    class="cms-view cms-list meinchat-plus-admin"
    data-testid="meinchat-plus-admin"
  >
    <div class="cms-list__header">
      <h1>{{ $t('meinchatPlusAdmin.title', 'Secure chat (E2E)') }}</h1>
      <div class="cms-list__actions">
        <form
          class="meinchat-plus-admin__lookup"
          @submit.prevent="lookup"
        >
          <input
            v-model="userId"
            type="search"
            class="cms-list__search"
            data-testid="user-id-input"
            :placeholder="$t('meinchatPlusAdmin.userIdPlaceholder', 'User ID')"
          >
          <button
            type="submit"
            class="btn btn--sm"
          >
            {{ $t('meinchatPlusAdmin.lookup', 'List devices') }}
          </button>
        </form>
      </div>
    </div>

    <p class="cms-list__hint">
      {{
        $t(
          'meinchatPlusAdmin.notice',
          'Messages are end-to-end encrypted — content is NOT available to administrators. Only public device keys are visible.',
        )
      }}
    </p>

    <p
      v-if="error"
      class="meinchat-plus-admin__error"
      data-testid="error"
    >
      {{ error }}
    </p>

    <table
      v-if="devices.length"
      class="cms-table"
      data-testid="device-table"
    >
      <thead>
        <tr>
          <th>{{ $t('meinchatPlusAdmin.device', 'Device') }}</th>
          <th>{{ $t('meinchatPlusAdmin.algorithm', 'Algorithm') }}</th>
          <th>{{ $t('meinchatPlusAdmin.identityKey', 'Identity key (public)') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="d in devices"
          :key="d.id"
        >
          <td>{{ d.label || d.id }}</td>
          <td>{{ d.algorithm }}</td>
          <td class="meinchat-plus-admin__key">
            {{ d.public_key }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { listUserDevices, type DeviceKeyRow } from '../api';

const userId = ref('');
const devices = ref<DeviceKeyRow[]>([]);
const error = ref('');

async function lookup() {
  error.value = '';
  devices.value = [];
  try {
    devices.value = await listUserDevices(userId.value.trim());
  } catch (e: unknown) {
    error.value = (e as { error?: string })?.error ?? 'lookup failed';
  }
}
</script>

<style scoped>
/* Mirror the default admin list layout (cms-admin / meinchat-admin) so this
   view inherits the same "card + table" look without depending on another
   plugin's stylesheet being loaded. */
.cms-view { background: var(--admin-card-bg, #fff); padding: 20px; border-radius: 8px; }

.cms-list__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 0.75rem; }
.cms-list__header h1 { margin: 0; font-size: 1.25rem; color: var(--admin-heading, #2c3e50); }
.cms-list__actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.cms-list__search { padding: 8px 12px; border: 1px solid var(--admin-input-border, #ddd); border-radius: 4px; font-size: 14px; width: 220px; background: var(--admin-card-bg, #fff); color: var(--admin-text, #333); }
.cms-list__search:focus { outline: none; border-color: var(--admin-focus, #3498db); }
.cms-list__hint { color: var(--admin-text-muted, #666); font-size: 0.8rem; margin: 0 0 16px; }

.meinchat-plus-admin__lookup { display: flex; gap: 8px; align-items: center; }
.meinchat-plus-admin__error { color: var(--admin-danger, #ef4444); font-size: 0.85rem; margin: 0 0 16px; }
.meinchat-plus-admin__key { font-family: monospace; font-size: 12px; word-break: break-all; }

.cms-table { width: 100%; border-collapse: collapse; }
.cms-table th, .cms-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid var(--admin-border-light, #eee); font-size: 14px; color: var(--admin-text, #333); }
.cms-table th { background: var(--admin-th-bg, #f8f9fa); font-weight: 600; color: var(--admin-heading, #2c3e50); }

.btn { padding: 8px 16px; border: 1px solid var(--admin-border, #e0e0e0); border-radius: 4px; background: var(--admin-card-bg, #fff); color: var(--admin-text, #333); cursor: pointer; font-size: 14px; }
.btn--sm { padding: 0.3rem 0.7rem; font-size: 0.8rem; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
