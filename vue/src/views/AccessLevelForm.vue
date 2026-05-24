<template>
  <div class="access-form">
    <div class="page-header">
      <h1>{{ pageTitle }}</h1>
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

      <!-- Plugin-injected form fields -->
      <component
        :is="field.component"
        v-for="(field, index) in pluginFormFields"
        :key="index"
        :form="pluginFieldForm"
        :is-new="isNew"
        :is-user-type="isUserType"
        :can-manage="canManage"
        @update:field="(key: string, value: string) => { pluginFieldValues[key] = value; }"
      />

      <!-- Permission Matrix -->
      <div class="form-section">
        <h2>{{ isUserType ? 'User Permissions' : $t('access.permissions') }}</h2>
        <PermissionMatrixTable
          :permissions="allPermissions"
          :selected="selectedPermissions"
          @toggle="togglePermission"
        />
      </div>

      <!-- Visible Content (user access levels, edit mode only) -->
      <div
        v-if="!isNew && isUserType && (contentPages.length > 0 || contentWidgets.length > 0)"
        class="form-section"
      >
        <h2>Visible Content</h2>
        <div
          v-if="contentPages.length > 0"
          class="content-list"
        >
          <h3 class="content-subheading">
            Pages ({{ contentPages.length }})
          </h3>
          <div
            v-for="page in contentPages"
            :key="page.id"
            class="content-item"
          >
            {{ page.name }} <span class="mono text-muted">/{{ page.slug }}</span>
          </div>
        </div>
        <div
          v-if="contentWidgets.length > 0"
          class="content-list"
        >
          <h3 class="content-subheading">
            Widgets ({{ contentWidgets.length }})
          </h3>
          <div
            v-for="widget in contentWidgets"
            :key="widget.id"
            class="content-item"
          >
            {{ widget.area_name }} <span class="mono text-muted">({{ widget.widget_id.slice(0, 8) }}...)</span>
          </div>
        </div>
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
import { useI18n } from 'vue-i18n';
import PermissionMatrixTable from '@/components/PermissionMatrixTable.vue';
import { extensionRegistry } from '@/plugins/extensionRegistry';

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

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('settings.system'));
const levelId = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !levelId.value || route.name === 'access-level-new');
const isUserType = computed(() => route.query.type === 'user');

const pageTitle = computed(() => {
  if (isNew.value) {
    return isUserType.value ? 'New User Access Level' : t('access.newLevel');
  }
  return `Edit: ${form.name}`;
});

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
const contentPages = ref<{ id: string; name: string; slug: string }[]>([]);
const contentWidgets = ref<{ id: string; area_name: string; widget_id: string }[]>([]);

const pluginFormFields = computed(() =>
  extensionRegistry.getAccessLevelFormFields().filter(
    (field) => !field.userOnly || isUserType.value
  )
);

// Form keys owned by the currently-visible plugin fields. The form loads,
// seeds, and saves these generically so core never names a plugin field.
const pluginFieldKeys = computed(() =>
  pluginFormFields.value.flatMap((field) => field.fields ?? [])
);

// Reactive bag holding plugin-owned field values, merged into `form` for the
// plugin field components and folded back into the save payload.
const pluginFieldValues = reactive<Record<string, unknown>>({});

// What plugin field components receive as `form`: core fields + their own.
const pluginFieldForm = computed(() => ({ ...form, ...pluginFieldValues }));

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
  const endpoint = isUserType.value
    ? `/admin/access/users/${userId}/user-access-levels/${levelId.value}`
    : `/admin/access/users/${userId}/roles/${levelId.value}`;
  await api.delete(endpoint);
  assignedUsers.value = assignedUsers.value.filter(u => u.id !== userId);
}

async function save() {
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      permissions: [...selectedPermissions],
    };
    // Fold plugin-owned fields into the payload generically.
    for (const key of pluginFieldKeys.value) {
      payload[key] = pluginFieldValues[key] || null;
    }

    if (isUserType.value) {
      if (isNew.value) {
        const res = await api.post('/admin/access/user-levels', payload) as { level: { id: string } };
        router.push(`/admin/settings/access/${res.level.id}?type=user`);
      } else {
        await api.put(`/admin/access/user-levels/${levelId.value}`, payload);
      }
    } else {
      if (isNew.value) {
        const res = await api.post('/admin/access/levels', payload) as { level: { id: string } };
        router.push(`/admin/settings/access/${res.level.id}`);
      } else {
        await api.put(`/admin/access/levels/${levelId.value}`, payload);
      }
    }
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    // Load available permissions (admin or user)
    const permEndpoint = isUserType.value
      ? '/admin/access/user-permissions'
      : '/admin/access/permissions';
    const permRes = await api.get(permEndpoint) as { permissions: Record<string, PermDef[]> };
    const flat: PermDef[] = [];
    for (const perms of Object.values(permRes.permissions)) {
      flat.push(...perms);
    }
    allPermissions.value = flat;

    // Load existing level if editing
    if (!isNew.value && levelId.value) {
      const levelEndpoint = isUserType.value
        ? `/admin/access/user-levels/${levelId.value}`
        : `/admin/access/levels/${levelId.value}`;
      const res = await api.get(levelEndpoint) as {
        level: {
          name: string;
          slug: string;
          description: string;
          is_system: boolean;
          permissions: string[];
          users: AssignedUser[];
        } & Record<string, unknown>;
      };
      form.name = res.level.name;
      form.slug = res.level.slug;
      form.description = res.level.description || '';
      form.is_system = res.level.is_system;
      // Load plugin-owned fields generically (e.g. linked_plan_slug).
      for (const key of pluginFieldKeys.value) {
        pluginFieldValues[key] = res.level[key] ?? '';
      }
      res.level.permissions.forEach(p => selectedPermissions.add(p));
      assignedUsers.value = res.level.users || [];

      // Load content visibility data for user access levels
      if (isUserType.value) {
        try {
          const contentRes = await api.get(`/admin/access/user-levels/${levelId.value}/content`) as {
            pages: { id: string; name: string; slug: string }[];
            widgets: { id: string; area_name: string; widget_id: string }[];
          };
          contentPages.value = contentRes.pages || [];
          contentWidgets.value = contentRes.widgets || [];
        } catch {
          // CMS plugin may not be available
        }
      }
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
.form-hint { font-size: 12px; color: #9ca3af; }
.mono { font-family: monospace; }

/* Users */
.user-list { display: flex; flex-direction: column; gap: 6px; }
.user-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 4px; }

.btn { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 14px; background: white; text-decoration: none; }
.btn--primary { background: #3b82f6; color: white; border-color: #3b82f6; }
.btn--sm { padding: 4px 8px; font-size: 12px; }
.btn--danger { background: #ef4444; color: white; border-color: #ef4444; }
.loading { padding: 40px; text-align: center; color: #6b7280; }
.text-muted { color: #9ca3af; }
.content-list { margin-bottom: 12px; }
.content-subheading { font-size: 0.85rem; font-weight: 600; color: #6b7280; margin: 0 0 6px; }
.content-item { padding: 4px 0; font-size: 0.9rem; border-bottom: 1px solid #f3f4f6; }
</style>
