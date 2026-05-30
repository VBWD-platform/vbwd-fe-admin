<template>
  <div
    class="meinchat-plus-admin"
    data-testid="meinchat-plus-admin"
  >
    <h1>{{ $t('meinchatPlusAdmin.title', 'Secure chat (E2E)') }}</h1>
    <p class="meinchat-plus-admin__notice">
      {{
        $t(
          'meinchatPlusAdmin.notice',
          'Messages are end-to-end encrypted — content is NOT available to administrators. Only public device keys are visible.',
        )
      }}
    </p>

    <form
      class="meinchat-plus-admin__lookup"
      @submit.prevent="lookup"
    >
      <input
        v-model="userId"
        data-testid="user-id-input"
        :placeholder="$t('meinchatPlusAdmin.userIdPlaceholder', 'User ID')"
      >
      <button type="submit">
        {{ $t('meinchatPlusAdmin.lookup', 'List devices') }}
      </button>
    </form>

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
