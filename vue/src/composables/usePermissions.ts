/**
 * Permission composable for admin frontend.
 *
 * Wraps the auth store's permission getters for use in components and guards.
 */
import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';

export function usePermissions() {
  const authStore = useAuthStore();

  const userPermissions = computed<string[]>(() =>
    authStore.user?.permissions ?? []
  );

  const userRole = computed<string>(() =>
    authStore.user?.role ?? ''
  );

  function hasPermission(permission: string): boolean {
    return authStore.hasPermission(permission);
  }

  function hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => authStore.hasPermission(p));
  }

  function hasRole(role: string): boolean {
    return authStore.hasRole(role);
  }

  const isAdmin = computed(() => authStore.isAdmin);
  const isSuperAdmin = computed(() => authStore.user?.role === 'SUPER_ADMIN');

  return {
    userPermissions,
    userRole,
    hasPermission,
    hasAnyPermission,
    hasRole,
    isAdmin,
    isSuperAdmin,
  };
}
