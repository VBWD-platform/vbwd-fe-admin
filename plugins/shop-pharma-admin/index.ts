/**
 * Pharmacy Admin Plugin (shop-pharma-admin) — S101.2
 *
 * A first-class "Pharmacy" admin section (its own nav group + views), NOT a tab
 * bolted onto shop. It manages the 5-class medicine/device catalogue end-to-end
 * via the S101.1 pharma admin API + the S101.0 shop variant API. It never edits
 * the host app or vbwd-fe-admin-plugin-shop — it owns its own routes/nav/views.
 *
 * Liskov: with this plugin disabled, shop-admin renders exactly as before — the
 * pharma section simply does not appear.
 */
import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import zh from './locales/zh.json';

const PHARMA_KEY = 'pharma';

function pharmaSlice(messages: Record<string, unknown>): Record<string, unknown> {
  return { [PHARMA_KEY]: messages[PHARMA_KEY] };
}

export const shopPharmaAdminPlugin: IPlugin = {
  name: 'shop-pharma-admin',
  version: '26.6',
  description: 'Pharmacy admin — 5-class medicine/device catalogue, pack variants, compliance',

  install(sdk: IPlatformSDK) {
    sdk.addTranslations('en', pharmaSlice(en as Record<string, unknown>));
    sdk.addTranslations('de', pharmaSlice(de as Record<string, unknown>));
    sdk.addTranslations('es', pharmaSlice(es as Record<string, unknown>));
    sdk.addTranslations('fr', pharmaSlice(fr as Record<string, unknown>));
    sdk.addTranslations('ja', pharmaSlice(ja as Record<string, unknown>));
    sdk.addTranslations('ru', pharmaSlice(ru as Record<string, unknown>));
    sdk.addTranslations('th', pharmaSlice(th as Record<string, unknown>));
    sdk.addTranslations('zh', pharmaSlice(zh as Record<string, unknown>));

    sdk.addRoute({
      path: 'pharma/products',
      name: 'pharma-products',
      component: () => import('./src/views/PharmaCatalogue.vue'),
      meta: { requiredPermission: 'pharma.manage' },
    });
    sdk.addRoute({
      path: 'pharma/products/new',
      name: 'pharma-product-new',
      component: () => import('./src/views/PharmaProductForm.vue'),
      meta: { requiredPermission: 'pharma.manage' },
    });
    sdk.addRoute({
      path: 'pharma/products/:id/edit',
      name: 'pharma-product-edit',
      component: () => import('./src/views/PharmaProductForm.vue'),
      meta: { requiredPermission: 'pharma.manage' },
    });
    sdk.addRoute({
      path: 'pharma/compliance',
      name: 'pharma-compliance',
      component: () => import('./src/views/PharmaCompliance.vue'),
      meta: { requiredPermission: 'pharma.manage' },
    });
  },

  activate() {
    extensionRegistry.register('shop-pharma-admin', {
      navSections: [
        {
          id: 'pharmacy',
          label: 'Pharmacy',
          items: [
            {
              label: 'Catalogue',
              to: '/admin/pharma/products',
              id: 'pharma-catalogue',
              requiredPermission: 'pharma.manage',
            },
            {
              label: 'Compliance',
              to: '/admin/pharma/compliance',
              id: 'pharma-compliance',
              requiredPermission: 'pharma.manage',
            },
          ],
        },
      ],
    });
  },

  deactivate() {
    extensionRegistry.unregister('shop-pharma-admin');
  },
};
