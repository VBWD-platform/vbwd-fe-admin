import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AdminLayout from '@/layouts/AdminLayout.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/admin/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/admin/forbidden',
    name: 'forbidden',
    component: () => import('@/views/Forbidden.vue'),
    meta: { public: true }
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/Dashboard.vue')
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/Users.vue'),
        meta: { requiredPermission: 'users.view' }
      },
      {
        path: 'users/create',
        name: 'user-create',
        component: () => import('@/views/UserCreate.vue'),
        meta: { requiredPermission: 'users.manage' }
      },
      {
        path: 'users/:id',
        name: 'user-details',
        component: () => import('@/views/UserDetails.vue'),
        meta: { requiredPermission: 'users.view' }
      },
      {
        path: 'users/:id/edit',
        name: 'user-edit',
        component: () => import('@/views/UserEdit.vue'),
        meta: { requiredPermission: 'users.view' }
      },
      {
        path: 'payment-methods',
        name: 'payment-methods',
        component: () => import('@/views/PaymentMethods.vue'),
        meta: { requiredPermission: 'settings.manage' }
      },
      {
        path: 'payment-methods/new',
        name: 'payment-method-new',
        component: () => import('@/views/PaymentMethodForm.vue'),
        meta: { requiredPermission: 'settings.manage' }
      },
      {
        path: 'payment-methods/:id/edit',
        name: 'payment-method-edit',
        component: () => import('@/views/PaymentMethodForm.vue'),
        meta: { requiredPermission: 'settings.manage' }
      },
      {
        path: 'invoices',
        name: 'invoices',
        component: () => import('@/views/Invoices.vue'),
        meta: { requiredPermission: 'invoices.view' }
      },
      {
        path: 'invoices/:id',
        name: 'invoice-details',
        component: () => import('@/views/InvoiceDetails.vue'),
        meta: { requiredPermission: 'invoices.view' }
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/Settings.vue'),
        meta: { requiredPermission: 'settings.view' }
      },
      {
        path: 'settings/token-bundles/new',
        name: 'token-bundle-new',
        component: () => import('@/views/TokenBundleForm.vue'),
        meta: { requiredPermission: 'settings.manage' }
      },
      {
        path: 'settings/token-bundles/:id',
        name: 'token-bundle-edit',
        component: () => import('@/views/TokenBundleForm.vue'),
        meta: { requiredPermission: 'settings.manage' }
      },
      {
        path: 'settings/plugins/:pluginName',
        name: 'plugin-details',
        component: () => import('@/views/PluginDetails.vue'),
        meta: { requiredPermission: 'settings.system' }
      },
      {
        path: 'settings/backend-plugins/:pluginName',
        name: 'backend-plugin-details',
        component: () => import('@/views/BackendPluginDetails.vue'),
        meta: { requiredPermission: 'settings.system' }
      },
      {
        path: 'settings/user-plugins/:pluginName',
        name: 'user-plugin-details',
        component: () => import('@/views/UserPluginDetails.vue'),
        meta: { requiredPermission: 'settings.system' }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/Profile.vue')
      },
      {
        path: 'cms/routing-rules',
        name: 'routing-rules',
        component: () => import('@/views/RoutingRules.vue')
      },
      {
        path: 'settings/access',
        name: 'access-levels',
        component: () => import('@/views/AccessLevels.vue'),
        meta: { requiredPermission: 'settings.system' }
      },
      {
        path: 'settings/access/:id',
        name: 'access-level-edit',
        component: () => import('@/views/AccessLevelForm.vue'),
        meta: { requiredPermission: 'settings.system' }
      },
      {
        path: 'settings/access/new',
        name: 'access-level-new',
        component: () => import('@/views/AccessLevelForm.vue'),
        meta: { requiredPermission: 'settings.system' }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  // Public routes don't require authentication
  if (to.meta.public) {
    // Redirect to dashboard if already authenticated and trying to access login
    if (to.name === 'login' && authStore.isAuthenticated) {
      next({ name: 'dashboard' });
    } else {
      next();
    }
    return;
  }

  // Protected routes require authentication
  if (!authStore.isAuthenticated) {
    next({ name: 'login' });
    return;
  }

  // Permission check — if route has requiredPermission meta
  const requiredPermission = to.meta.requiredPermission as string | undefined;
  if (requiredPermission && !authStore.hasPermission(requiredPermission)) {
    next({ name: 'forbidden', query: { required: requiredPermission } });
    return;
  }

  next();
});

export default router;
