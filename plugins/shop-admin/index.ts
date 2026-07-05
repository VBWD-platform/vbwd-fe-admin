import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';

export const shopAdminPlugin: IPlugin = {
  name: 'shop-admin',
  version: '26.6.1',
  description: 'Shop admin — products, categories, orders, stock, warehouses',

  install(sdk: IPlatformSDK) {
    sdk.addRoute({
      path: 'shop/products',
      name: 'shop-products',
      component: () => import('./src/views/Products.vue'),
      meta: { requiredPermission: 'shop.products.view' },
    });
    sdk.addRoute({
      path: 'shop/products/new',
      name: 'shop-product-new',
      component: () => import('./src/views/ProductForm.vue'),
      meta: { requiredPermission: 'shop.products.manage' },
    });
    sdk.addRoute({
      path: 'shop/products/:id/edit',
      name: 'shop-product-edit',
      component: () => import('./src/views/ProductForm.vue'),
      meta: { requiredPermission: 'shop.products.view' },
    });
    sdk.addRoute({
      path: 'shop/categories',
      name: 'shop-categories',
      component: () => import('./src/views/ProductCategories.vue'),
      meta: { requiredPermission: 'shop.categories.manage' },
    });
    sdk.addRoute({
      path: 'shop/product-types',
      name: 'shop-product-types',
      component: () => import('./src/views/ProductTypes.vue'),
      meta: { requiredPermission: 'shop.products.view' },
    });
    sdk.addRoute({
      path: 'shop/orders',
      name: 'shop-orders',
      component: () => import('./src/views/Orders.vue'),
      meta: { requiredPermission: 'shop.orders.view' },
    });
    sdk.addRoute({
      path: 'shop/orders/:id',
      name: 'shop-order-detail',
      component: () => import('./src/views/OrderDetails.vue'),
      meta: { requiredPermission: 'shop.orders.view' },
    });
    sdk.addRoute({
      path: 'shop/stock',
      name: 'shop-stock',
      component: () => import('./src/views/StockOverview.vue'),
      meta: { requiredPermission: 'shop.stock.manage' },
    });
    sdk.addRoute({
      path: 'shop/warehouses',
      name: 'shop-warehouses',
      component: () => import('./src/views/Warehouses.vue'),
      meta: { requiredPermission: 'shop.warehouses.manage' },
    });

    sdk.addRoute({
      path: 'shop/shipping',
      name: 'shop-shipping',
      component: () => import('./src/views/ShippingMethods.vue'),
      meta: { requiredPermission: 'shop.configure' },
    });

    sdk.addComponent(
      'ShopRevenueWidget',
      () => import('./src/components/ShopRevenueWidget.vue') as Promise<{ default: unknown }>
    );
  },

  activate() {
    extensionRegistry.register('shop-admin', {
      sectionItems: {
        sales: [
          {
            label: 'Shop',
            to: '/admin/shop/products',
            id: 'shop',
            icon: 'bag',
            requiredPermission: 'shop.products.view',
            children: [
              { label: 'Products', to: '/admin/shop/products', icon: 'bag', requiredPermission: 'shop.products.view' },
              { label: 'Product Types', to: '/admin/shop/product-types', icon: 'layers', requiredPermission: 'shop.products.view' },
              { label: 'Categories', to: '/admin/shop/categories', icon: 'tag', requiredPermission: 'shop.categories.manage' },
              { label: 'Orders', to: '/admin/shop/orders', icon: 'cart', requiredPermission: 'shop.orders.view' },
              { label: 'Stock', to: '/admin/shop/stock', icon: 'layers', requiredPermission: 'shop.stock.manage' },
              { label: 'Warehouses', to: '/admin/shop/warehouses', icon: 'grid', requiredPermission: 'shop.warehouses.manage' },
              { label: 'Shipping', to: '/admin/shop/shipping', icon: 'send', requiredPermission: 'shop.configure' },
            ],
          },
        ],
      },
    });
  },

  deactivate() {
    extensionRegistry.unregister('shop-admin');
  },
};
