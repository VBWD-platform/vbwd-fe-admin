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
        component: () => import('@/views/Users.vue')
      },
      {
        path: 'users/create',
        name: 'user-create',
        component: () => import('@/views/UserCreate.vue')
      },
      {
        path: 'users/:id',
        name: 'user-details',
        component: () => import('@/views/UserDetails.vue')
      },
      {
        path: 'users/:id/edit',
        name: 'user-edit',
        component: () => import('@/views/UserEdit.vue')
      },
      {
        path: 'payment-methods',
        name: 'payment-methods',
        component: () => import('@/views/PaymentMethods.vue')
      },
      {
        path: 'payment-methods/new',
        name: 'payment-method-new',
        component: () => import('@/views/PaymentMethodForm.vue')
      },
      {
        path: 'payment-methods/:id/edit',
        name: 'payment-method-edit',
        component: () => import('@/views/PaymentMethodForm.vue')
      },
      {
        path: 'invoices',
        name: 'invoices',
        component: () => import('@/views/Invoices.vue')
      },
      {
        path: 'invoices/:id',
        name: 'invoice-details',
        component: () => import('@/views/InvoiceDetails.vue')
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/Settings.vue')
      },
      {
        path: 'settings/token-bundles/new',
        name: 'token-bundle-new',
        component: () => import('@/views/TokenBundleForm.vue')
      },
      {
        path: 'settings/token-bundles/:id',
        name: 'token-bundle-edit',
        component: () => import('@/views/TokenBundleForm.vue')
      },
      {
        path: 'settings/plugins/:pluginName',
        name: 'plugin-details',
        component: () => import('@/views/PluginDetails.vue')
      },
      {
        path: 'settings/backend-plugins/:pluginName',
        name: 'backend-plugin-details',
        component: () => import('@/views/BackendPluginDetails.vue')
      },
      {
        path: 'settings/user-plugins/:pluginName',
        name: 'user-plugin-details',
        component: () => import('@/views/UserPluginDetails.vue')
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

  next();
});

export default router;
