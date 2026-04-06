<template>
  <div class="access-levels">
    <div class="page-header">
      <h1>{{ $t('access.title') }}</h1>
      <div class="page-header__actions">
        <button
          v-if="canManage"
          class="btn"
          @click="handleExport"
        >
          {{ $t('access.export') }}
        </button>
        <button
          v-if="canManage"
          class="btn"
          @click="importInput?.click()"
        >
          {{ $t('access.import') }}
        </button>
        <input
          ref="importInput"
          type="file"
          accept=".json"
          style="display:none"
          @change="handleImport"
        >
        <router-link
          v-if="canManage"
          to="/admin/settings/access/new"
          class="btn btn--primary"
        >
          + {{ $t('access.newLevel') }}
        </router-link>
      </div>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      {{ $t('common.loading') }}
    </div>

    <table
      v-else-if="levels.length > 0"
      class="data-table"
    >
      <thead>
        <tr>
          <th>{{ $t('access.name') }}</th>
          <th>{{ $t('access.slug') }}</th>
          <th>{{ $t('access.permissions') }}</th>
          <th>{{ $t('access.system') }}</th>
          <th>{{ $t('access.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="level in levels"
          :key="level.id"
        >
          <td>
            <router-link
              :to="`/admin/settings/access/${level.id}`"
              class="link"
            >
              {{ level.name }}
            </router-link>
          </td>
          <td class="mono">
            {{ level.slug }}
          </td>
          <td>{{ level.permissions.length }} {{ $t('access.permissions') }}</td>
          <td>
            <span
              v-if="level.is_system"
              class="badge badge--blue"
            >{{ $t('access.system') }}</span>
          </td>
          <td>
            <button
              v-if="canManage && !level.is_system"
              class="btn btn--sm btn--danger"
              @click="handleDelete(level.id, level.name)"
            >
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-else
      class="empty"
    >
      {{ $t('access.noLevels') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/api';
import { useAuthStore } from '@/stores/auth';

interface AccessLevel {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  permissions: string[];
}

const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('settings.system'));

const importInput = ref<HTMLInputElement | null>(null);
const loading = ref(true);
const levels = ref<AccessLevel[]>([]);

async function load() {
  loading.value = true;
  try {
    const res = await api.get('/admin/access/levels') as { levels: AccessLevel[] };
    levels.value = res.levels;
  } finally {
    loading.value = false;
  }
}

async function handleDelete(id: string, name: string) {
  if (!confirm(`Delete access level "${name}"?`)) return;
  await api.delete(`/admin/access/levels/${id}`);
  await load();
}

async function handleExport() {
  const res = await api.post('/admin/access/export', {}) as Record<string, unknown>;
  const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'access-levels.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    await api.post('/admin/access/import', payload);
    await load();
  } catch (err) {
    alert((err as Error)?.message ?? 'Import failed');
  } finally {
    (e.target as HTMLInputElement).value = '';
  }
}

onMounted(load);
</script>

<style scoped>
.access-levels { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header__actions { display: flex; gap: 8px; align-items: center; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.data-table th { background: #f8f9fa; font-weight: 600; }
.mono { font-family: monospace; font-size: 0.85rem; color: #6b7280; }
.link { color: #3b82f6; text-decoration: none; font-weight: 600; }
.link:hover { text-decoration: underline; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
.badge--green { background: #d4edda; color: #155724; }
.badge--gray { background: #e9ecef; color: #6c757d; }
.badge--blue { background: #cce5ff; color: #004085; }
.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; background: white; }
.btn--primary { background: #3b82f6; color: white; border-color: #3b82f6; text-decoration: none; }
.btn--sm { padding: 4px 8px; font-size: 12px; }
.btn--danger { background: #ef4444; color: white; border-color: #ef4444; }
.loading, .empty { padding: 40px; text-align: center; color: #6b7280; }
</style>
