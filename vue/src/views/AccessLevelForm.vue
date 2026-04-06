<template>
  <div class="access-form">
    <div class="page-header">
      <h1>{{ isNew ? $t('access.newLevel') : `Edit: ${form.name}` }}</h1>
      <div class="page-header__actions">
        <router-link
          to="/admin/settings/access"
          class="btn"
        >
          Cancel
        </router-link>
        <button
          v-if="canManage"
          class="btn btn--primary"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? $t('access.saving') : $t('access.save') }}
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      Loading...
    </div>

    <template v-else>
      <!-- Basic Fields -->
      <div class="form-section">
        <div class="form-grid">
          <div class="form-group">
            <label>{{ $t('access.name') }}</label>
            <input
              v-model="form.name"
              type="text"
              class="form-input"
              @blur="autoSlug"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('access.slug') }}</label>
            <input
              v-model="form.slug"
              type="text"
              class="form-input mono"
              :disabled="!isNew && form.is_system"
            >
          </div>
          <div class="form-group full-width">
            <label>{{ $t('access.description') }}</label>
            <input
              v-model="form.description"
              type="text"
              class="form-input"
            >
          </div>
        </div>
      </div>

      <!-- Permission Matrix -->
      <div class="form-section">
        <h2>{{ $t('access.permissions') }}</h2>
        <PermissionMatrixTable
          :permissions="allPermissions"
          :selected="selectedPermissions"
          @toggle="togglePermission"
        />
      </div>

      <!-- Assigned Users (edit mode only) -->
      <div
        v-if="!isNew && assignedUsers.length > 0"
        class="form-section"
      >
        <h2>Assigned Users ({{ assignedUsers.length }})</h2>
        <div class="user-list">
          <div
            v-for="user in assignedUsers"
            :key="user.id"
            class="user-item"
          >
            <span>{{ user.email }}</span>
            <button
              class="btn btn--sm btn--danger"
              @click="revokeUser(user.id)"
            >
              Revoke
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';
import { useAuthStore } from '@/stores/auth';
import PermissionMatrixTable from '@/components/PermissionMatrixTable.vue';

interface PermDef {
  key: string;
  label: string;
  group: string;
}

interface AssignedUser {
  id: string;
  email: string;
  name: string | null;
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('settings.system'));
const levelId = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !levelId.value || route.name === 'access-level-new');

const loading = ref(true);
const saving = ref(false);
const form = reactive({
  name: '',
  slug: '',
  description: '',
  is_system: false,
});

const allPermissions = ref<PermDef[]>([]);
const selectedPermissions = reactive(new Set<string>());
const assignedUsers = ref<AssignedUser[]>([]);

function autoSlug() {
  if (isNew.value && !form.slug) {
    form.slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}

function togglePermission(key: string) {
  if (selectedPermissions.has(key)) {
    selectedPermissions.delete(key);
  } else {
    selectedPermissions.add(key);
  }
}

async function revokeUser(userId: string) {
  if (!levelId.value) return;
  await api.delete(`/admin/access/users/${userId}/roles/${levelId.value}`);
  assignedUsers.value = assignedUsers.value.filter(u => u.id !== userId);
}

async function save() {
  saving.value = true;
  try {
    const payload = {
      ...form,
      permissions: [...selectedPermissions],
    };
    if (isNew.value) {
      const res = await api.post('/admin/access/levels', payload) as { level: { id: string } };
      router.push(`/admin/settings/access/${res.level.id}`);
    } else {
      await api.put(`/admin/access/levels/${levelId.value}`, payload);
    }
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    // Load available permissions
    const permRes = await api.get('/admin/access/permissions') as { permissions: Record<string, PermDef[]> };
    const flat: PermDef[] = [];
    for (const perms of Object.values(permRes.permissions)) {
      flat.push(...perms);
    }
    allPermissions.value = flat;

    // Load existing level if editing
    if (!isNew.value && levelId.value) {
      const res = await api.get(`/admin/access/levels/${levelId.value}`) as { level: { name: string; slug: string; description: string; is_system: boolean; permissions: string[]; users: AssignedUser[] } };
      form.name = res.level.name;
      form.slug = res.level.slug;
      form.description = res.level.description || '';
      form.is_system = res.level.is_system;
      res.level.permissions.forEach(p => selectedPermissions.add(p));
      assignedUsers.value = res.level.users || [];
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.access-form { background: white; padding: 20px; border-radius: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header__actions { display: flex; gap: 8px; }
.form-section { margin-bottom: 24px; }
.form-section h2 { font-size: 1.1rem; font-weight: 600; color: #374151; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-input { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
.form-input:focus { border-color: #3b82f6; outline: none; }
.mono { font-family: monospace; }

/* Users */
.user-list { display: flex; flex-direction: column; gap: 6px; }
.user-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 4px; }

.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; background: white; text-decoration: none; }
.btn--primary { background: #3b82f6; color: white; border-color: #3b82f6; }
.btn--sm { padding: 4px 8px; font-size: 12px; }
.btn--danger { background: #ef4444; color: white; border-color: #ef4444; }
.loading { padding: 40px; text-align: center; color: #6b7280; }
</style>
