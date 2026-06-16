import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';
import en from './locales/en.json';

/**
 * referral-admin — Promotions → "VBWD Referral" (S92 Track B, slice B3).
 *
 * One tabbed page (Settings + Referral Statistics) backed by the `referral`
 * backend plugin's admin routes. Nav lives in the core **Sales** section next to
 * the discount-admin "Promotions" group; gated on `referral.view`.
 *
 * Nav placement note: the admin extension registry has no merge-by-id for
 * `sectionItems`, so a second `Promotions` parent cannot share discount-admin's
 * children without a core seam. Until that seam exists, "VBWD Referral" is
 * injected as its own L1 item positioned directly after the Promotions group
 * (a sibling under Sales), keeping it adjacent without rendering a duplicate
 * "Promotions" header.
 */
export const referralAdminPlugin: IPlugin = {
  name: 'referral-admin',
  version: '0.1.0',
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
            label: 'VBWD Referral',
            to: '/admin/promotions/referral',
            id: 'referral',
            position: 'after:promotions',
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
