import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';

export const shopAdminPlugin: IPlugin = {
  name: 'shop-admin',
  version: '0.1.0',
  description: 'Shop admin — products, categories, orders, stock, warehouses',

  install(sdk: IPlatformSDK) {
    // Routes
    sdk.addRoute({
      path: 'shop/products',
      name: 'shop-products',
      component: () => import('./src/views/Products.vue'),
    });
    sdk.addRoute({
      path: 'shop/products/new',
      name: 'shop-product-new',
      component: () => import('./src/views/ProductForm.vue'),
    });
    sdk.addRoute({
      path: 'shop/products/:id/edit',
      name: 'shop-product-edit',
      component: () => import('./src/views/ProductForm.vue'),
    });
    sdk.addRoute({
      path: 'shop/categories',
      name: 'shop-categories',
      component: () => import('./src/views/ProductCategories.vue'),
    });
    sdk.addRoute({
      path: 'shop/orders',
      name: 'shop-orders',
      component: () => import('./src/views/Orders.vue'),
    });
    sdk.addRoute({
      path: 'shop/orders/:id',
      name: 'shop-order-detail',
      component: () => import('./src/views/OrderDetails.vue'),
    });
    sdk.addRoute({
      path: 'shop/stock',
      name: 'shop-stock',
      component: () => import('./src/views/StockOverview.vue'),
    });
    sdk.addRoute({
      path: 'shop/warehouses',
      name: 'shop-warehouses',
      component: () => import('./src/views/Warehouses.vue'),
    });

    // Dashboard widget
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
            children: [
              { label: 'Products', to: '/admin/shop/products' },
              { label: 'Categories', to: '/admin/shop/categories' },
              { label: 'Orders', to: '/admin/shop/orders' },
              { label: 'Stock', to: '/admin/shop/stock' },
              { label: 'Warehouses', to: '/admin/shop/warehouses' },
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
