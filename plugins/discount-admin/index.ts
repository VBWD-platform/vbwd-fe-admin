import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';

export const discountAdminPlugin: IPlugin = {
  name: 'discount-admin',
  version: '0.1.0',
  description: 'Discount & coupon management — promotions admin',

  install(sdk: IPlatformSDK) {
    sdk.addRoute({
      path: 'promotions/discounts',
      name: 'discount-list',
      component: () => import('./src/views/Discounts.vue'),
      meta: { requiredPermission: 'discount.discounts.view' },
    });
    sdk.addRoute({
      path: 'promotions/discounts/new',
      name: 'discount-new',
      component: () => import('./src/views/DiscountForm.vue'),
      meta: { requiredPermission: 'discount.discounts.manage' },
    });
    sdk.addRoute({
      path: 'promotions/discounts/:id/edit',
      name: 'discount-edit',
      component: () => import('./src/views/DiscountForm.vue'),
      meta: { requiredPermission: 'discount.discounts.view' },
    });
    sdk.addRoute({
      path: 'promotions/coupons',
      name: 'coupon-list',
      component: () => import('./src/views/Coupons.vue'),
      meta: { requiredPermission: 'discount.coupons.view' },
    });
    sdk.addRoute({
      path: 'promotions/coupons/new',
      name: 'coupon-new',
      component: () => import('./src/views/CouponForm.vue'),
      meta: { requiredPermission: 'discount.coupons.manage' },
    });
    sdk.addRoute({
      path: 'promotions/coupons/:id/edit',
      name: 'coupon-edit',
      component: () => import('./src/views/CouponForm.vue'),
      meta: { requiredPermission: 'discount.coupons.view' },
    });
    sdk.addRoute({
      path: 'promotions/coupons/:id/usage',
      name: 'coupon-usage',
      component: () => import('./src/views/CouponUsage.vue'),
      meta: { requiredPermission: 'discount.coupons.view' },
    });
  },

  activate() {
    extensionRegistry.register('discount-admin', {
      sectionItems: {
        sales: [
          {
            label: 'Promotions',
            to: '/admin/promotions/discounts',
            id: 'promotions',
            requiredPermission: 'discount.discounts.view',
            children: [
              { label: 'Discounts', to: '/admin/promotions/discounts', requiredPermission: 'discount.discounts.view' },
              { label: 'Coupons', to: '/admin/promotions/coupons', requiredPermission: 'discount.coupons.view' },
            ],
          },
        ],
      },
    });
  },

  deactivate() {
    extensionRegistry.unregister('discount-admin');
  },
};
