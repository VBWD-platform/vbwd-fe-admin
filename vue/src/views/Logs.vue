<template>
  <div
    class="logs-view"
    data-testid="logs-view"
  >
    <div class="logs-header">
      <div>
        <h2>{{ $t('logs.title') }}</h2>
        <p class="section-description">
          {{ $t('logs.description') }}
        </p>
      </div>
    </div>

    <!-- Filter bar -->
    <div
      class="logs-filters"
      data-testid="logs-filters"
    >
      <div class="filter-group">
        <span class="filter-label">{{ $t('logs.filters.scopes') }}</span>
        <div class="scope-options">
          <label
            v-for="scope in store.availableScopes"
            :key="scope"
            class="scope-option"
            data-testid="logs-scope-option"
          >
            <input
              type="checkbox"
              :value="scope"
              :checked="store.filters.scopes.includes(scope)"
              @change="toggleScope(scope)"
            >
            {{ scope }}
          </label>
        </div>
      </div>

      <label class="filter-group">
        <span class="filter-label">{{ $t('logs.filters.stream') }}</span>
        <select
          v-model="selectedStream"
          class="filter-input"
          data-testid="logs-stream-select"
        >
          <option value="">
            {{ $t('logs.filters.allStreams') }}
          </option>
          <option
            v-for="stream in store.availableStreams"
            :key="stream"
            :value="stream"
          >
            {{ stream }}
          </option>
        </select>
      </label>

      <label class="filter-group">
        <span class="filter-label">{{ $t('logs.filters.level') }}</span>
        <select
          v-model="store.filters.level"
          class="filter-input"
          data-testid="logs-level-select"
        >
          <option value="">
            {{ $t('logs.filters.anyLevel') }}
          </option>
          <option
            v-for="level in LEVEL_OPTIONS"
            :key="level"
            :value="level"
          >
            {{ level }}
          </option>
        </select>
      </label>

      <label class="filter-group">
        <span class="filter-label">{{ $t('logs.filters.window') }}</span>
        <select
          v-model="selectedWindow"
          class="filter-input"
          data-testid="logs-window-select"
        >
          <option
            v-for="windowOption in WINDOW_OPTIONS"
            :key="windowOption.value"
            :value="windowOption.value"
          >
            {{ $t(windowOption.labelKey) }}
          </option>
        </select>
      </label>

      <label class="filter-group filter-grow">
        <span class="filter-label">{{ $t('logs.filters.contains') }}</span>
        <input
          v-model="store.filters.contains"
          type="text"
          class="filter-input"
          data-testid="logs-contains-input"
          :placeholder="$t('logs.filters.containsPlaceholder')"
          @keyup.enter="runQuery"
        >
      </label>

      <div class="filter-actions">
        <button
          class="primary-btn"
          data-testid="logs-query-button"
          :disabled="store.loading"
          @click="runQuery"
        >
          {{ $t('logs.actions.query') }}
        </button>
        <button
          class="toggle-btn"
          :class="{ active: store.tailing }"
          data-testid="logs-tail-toggle"
          @click="toggleTail"
        >
          {{ store.tailing ? $t('logs.actions.tailStop') : $t('logs.actions.tailStart') }}
        </button>
        <button
          class="secondary-btn"
          data-testid="logs-download-button"
          :disabled="!canDownload"
          :title="canDownload ? '' : $t('logs.actions.downloadHint')"
          @click="runDownload"
        >
          {{ $t('logs.actions.download') }}
        </button>
      </div>
    </div>

    <div
      v-if="store.error"
      class="error-message"
      data-testid="logs-error"
    >
      {{ store.error }}
    </div>

    <div
      v-if="store.truncated"
      class="truncation-note"
      data-testid="logs-truncation-note"
    >
      {{ $t('logs.truncated', { bytes: store.bytesScanned, segments: store.segmentsScanned }) }}
    </div>

    <!-- Records list -->
    <div
      class="logs-table"
      data-testid="logs-table"
    >
      <div
        v-for="(record, index) in store.records"
        :key="`${record.ts}-${index}`"
        class="logs-record-row"
        :class="levelClass(record)"
        data-testid="logs-record-row"
      >
        <span class="record-ts">{{ formatTimestamp(record.ts) }}</span>
        <span
          class="record-badge"
          :class="badgeClass(record)"
        >{{ recordLabel(record) }}</span>
        <span class="record-scope">{{ record.scope }}</span>
        <span class="record-logger">{{ recordLogger(record) }}</span>
        <span class="record-msg">{{ recordMessage(record) }}</span>
      </div>

      <p
        v-if="store.records.length === 0 && !store.loading"
        class="logs-empty"
        data-testid="logs-empty"
      >
        {{ $t('logs.empty') }}
      </p>
    </div>

    <div class="logs-footer">
      <button
        v-if="store.hasMore"
        class="secondary-btn"
        data-testid="logs-load-more"
        :disabled="store.loading"
        @click="runLoadMore"
      >
        {{ $t('logs.actions.loadMore') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useLogsStore } from '@/stores/logs';
import type { LogRecord } from '@/stores/logs';

const store = useLogsStore();

const LEVEL_OPTIONS = ['debug', 'info', 'warning', 'error', 'critical'] as const;

const WINDOW_OPTIONS = [
  { value: '15', labelKey: 'logs.windows.last15m' },
  { value: '60', labelKey: 'logs.windows.last1h' },
  { value: '1440', labelKey: 'logs.windows.last24h' },
  { value: 'all', labelKey: 'logs.windows.all' },
] as const;

// `select` v-models a string; the store keeps `minutes: number | null` +
// `allHistory: boolean`. Bridge the two so "all" maps to since=0.
const selectedWindow = computed<string>({
  get: () => (store.filters.allHistory ? 'all' : String(store.filters.minutes ?? '60')),
  set: (value: string) => {
    if (value === 'all') {
      store.filters.allHistory = true;
      store.filters.minutes = null;
    } else {
      store.filters.allHistory = false;
      store.filters.minutes = Number(value);
    }
  },
});

// The store supports a multi-select stream filter; the UI uses a single select
// for simplicity. Bridge the single value into the store's `streams` array.
const selectedStream = computed<string>({
  get: () => store.filters.streams[0] ?? '',
  set: (value: string) => {
    store.filters.streams = value ? [value] : [];
  },
});

const canDownload = computed<boolean>(
  () => store.filters.scopes.length === 1 && store.filters.streams.length === 1,
);

function toggleScope(scope: string): void {
  const current = store.filters.scopes;
  store.filters.scopes = current.includes(scope)
    ? current.filter((entry) => entry !== scope)
    : [...current, scope];
}

function isEventRecord(record: LogRecord): record is LogRecord & { event: string } {
  return typeof (record as { event?: unknown }).event === 'string';
}

function recordLabel(record: LogRecord): string {
  return isEventRecord(record) ? 'event' : String((record as { level?: string }).level ?? '');
}

function recordLogger(record: LogRecord): string {
  return String((record as { logger?: string }).logger ?? '');
}

function recordMessage(record: LogRecord): string {
  if (isEventRecord(record)) {
    const payload = (record as { payload?: unknown }).payload;
    const payloadText = payload === undefined ? '' : JSON.stringify(payload);
    return `${record.event} ${payloadText}`.trim();
  }
  return String((record as { msg?: string }).msg ?? '');
}

function levelClass(record: LogRecord): string {
  return `level-${recordLabel(record).toLowerCase() || 'event'}`;
}

function badgeClass(record: LogRecord): string {
  return `badge-${recordLabel(record).toLowerCase() || 'event'}`;
}

function formatTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().replace('T', ' ').replace('Z', '');
}

const isRunning = ref(false);

async function runQuery(): Promise<void> {
  if (isRunning.value) {
    return;
  }
  isRunning.value = true;
  try {
    await store.query();
  } finally {
    isRunning.value = false;
  }
}

async function runLoadMore(): Promise<void> {
  await store.loadMore();
}

async function runDownload(): Promise<void> {
  if (!canDownload.value) {
    return;
  }
  await store.download(store.filters.scopes[0], store.filters.streams[0]);
}

async function toggleTail(): Promise<void> {
  if (store.tailing) {
    store.stopTail();
    return;
  }
  // Seed the tail with a fresh query so it has a baseline to prepend onto.
  await store.query();
  store.startTail();
}

onMounted(async () => {
  await store.fetchScopes();
});

onBeforeUnmount(() => {
  store.stopTail();
});
</script>

<style scoped>
.logs-view {
  padding: 20px;
}

.logs-header {
  margin-bottom: 16px;
}

.section-description {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 4px 0 0;
}

.logs-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
}

.filter-grow {
  flex: 1;
  min-width: 180px;
}

.filter-label {
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-size: 0.7rem;
}

.filter-input {
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.85rem;
}

.scope-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-width: 360px;
}

.scope-option {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.primary-btn,
.secondary-btn,
.toggle-btn {
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  cursor: pointer;
  font-size: 0.85rem;
}

.primary-btn {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.toggle-btn.active {
  background: #16a34a;
  color: white;
  border-color: #16a34a;
}

.secondary-btn:disabled,
.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  background: #fef2f2;
  color: #b91c1c;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.truncation-note {
  background: #fffbeb;
  color: #92400e;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-bottom: 12px;
}

.logs-table {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.8rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.logs-record-row {
  display: grid;
  grid-template-columns: 170px 80px 110px 160px 1fr;
  gap: 10px;
  padding: 6px 12px;
  border-bottom: 1px solid #f3f4f6;
  align-items: baseline;
}

.logs-record-row:last-child {
  border-bottom: none;
}

.record-ts {
  color: #6b7280;
}

.record-badge {
  text-transform: uppercase;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  text-align: center;
}

.badge-error,
.badge-critical {
  background: #fee2e2;
  color: #b91c1c;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-info {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-debug {
  background: #f3f4f6;
  color: #4b5563;
}

.badge-event {
  background: #ede9fe;
  color: #6d28d9;
}

.record-scope {
  color: #374151;
}

.record-logger {
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-msg {
  color: #111827;
  white-space: pre-wrap;
  word-break: break-word;
}

.logs-empty {
  padding: 20px;
  color: #9ca3af;
  text-align: center;
}

.logs-footer {
  margin-top: 16px;
  text-align: center;
}
</style>
