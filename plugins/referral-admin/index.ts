import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';
import en from './locales/en.json';

/**
 * referral-admin — Promotions → "Referral" (S92 Track B, slice B3).
 *
 * One tabbed page (Settings + Referral Statistics) backed by the `referral`
 * backend plugin's admin routes. Nav nests as the 3rd child of the
 * discount-admin "Promotions" group (after Discounts and Coupons) via the
 * registry `child:promotions` seam; gated on `referral.view`.
 */
export const referralAdminPlugin: IPlugin = {
  name: 'referral-admin',
  version: '26.6.1',
  description: 'VBWD referral program configuration + statistics — promotions admin',

  install(sdk: IPlatformSDK) {
    sdk.addTranslations('en', { referralAdmin: (en as Record<string, unknown>).referralAdmin });

    sdk.addRoute({
      path: 'promotions/referral',
      name: 'referral-admin',
      component: () => import('./src/views/ReferralAdmin.vue'),
      meta: { requiredPermission: 'referral.view' },
    });
  },

  activate() {
    extensionRegistry.register('referral-admin', {
      sectionItems: {
        sales: [
          {
            label: 'Referral',
            to: '/admin/promotions/referral',
            id: 'referral',
            position: 'child:promotions',
            requiredPermission: 'referral.view',
          },
        ],
      },
    });
  },

  deactivate() {
    extensionRegistry.unregister('referral-admin');
  },
};
