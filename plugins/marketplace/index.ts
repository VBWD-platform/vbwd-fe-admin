import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';
import en from './locales/en.json';

/**
 * marketplace — a standalone "Marketplace" admin nav section.
 *
 * Two screens, both backed by the `marketplace` / `withdraw` backend plugins'
 * admin routes:
 *   - Vendors          → GET/PUT /api/v1/admin/marketplace/vendors
 *   - Withdraw requests → GET/POST/DELETE /api/v1/admin/withdraw/requests
 *
 * The section is registered in activate() so it respects enable/disable.
 */
export const marketplaceAdminPlugin: IPlugin = {
  name: 'marketplace',
  version: '1.1.0',
  description:
    'VBWD marketplace admin — vendor management + withdraw-request moderation.',

  install(sdk: IPlatformSDK) {
    // Translations
    sdk.addTranslations('en', { marketplace: (en as Record<string, unknown>).marketplace });

    // Admin routes (relative — mounted under /admin by the app shell).
    sdk.addRoute({
      path: 'marketplace/vendors',
      name: 'marketplace-vendors',
      component: () => import('./marketplace/views/VendorsList.vue'),
      meta: { requiredPermission: 'marketplace.manage' },
    });
    sdk.addRoute({
      path: 'marketplace/withdraw-requests',
      name: 'marketplace-withdraw-requests',
      component: () => import('./marketplace/views/WithdrawRequests.vue'),
      // Backend gates on @require_admin only — visible to any admin.
      meta: {},
    });
    sdk.addRoute({
      path: 'marketplace/withdraw-requests/:id',
      name: 'marketplace-withdraw-request-detail',
      component: () => import('./marketplace/views/WithdrawRequestDetail.vue'),
      meta: {},
    });

    // Nav is registered in activate() so it respects enable/disable.
  },

  activate() {
    extensionRegistry.register('marketplace', {
      navSections: [
        {
          id: 'marketplace',
          label: 'Marketplace',
          items: [
            {
              label: 'Vendors',
              to: '/admin/marketplace/vendors',
              id: 'marketplace-vendors',
              icon: 'users',
              requiredPermission: 'marketplace.manage',
            },
            {
              label: 'Withdraw requests',
              to: '/admin/marketplace/withdraw-requests',
              id: 'marketplace-withdraw-requests',
              icon: 'invoice',
            },
          ],
        },
      ],
    });
  },

  deactivate() {
    extensionRegistry.unregister('marketplace');
  },
};

// Default export — loader falls back to scanning named exports, but an explicit
// default is deterministic under bundler hot-reload paths.
export default marketplaceAdminPlugin;
