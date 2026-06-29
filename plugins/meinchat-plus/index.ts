// vbwd-fe-admin-plugin-meinchat-plus — admin surface for E2E chat.
//
// Deliberately thin: messages are end-to-end encrypted, so there is NO
// conversation inspector here (unlike meinchat-admin). Admins can only view
// users' REGISTERED DEVICE KEYS (public material) for support/abuse triage.

import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { extensionRegistry } from '../../vue/src/plugins/extensionRegistry';
import en from './locales/en.json';

const NAV_SECTIONS = [
  {
    id: 'meinchat-plus',
    label: 'Secure chat',
    items: [
      {
        label: 'Device keys',
        to: '/admin/meinchat-plus/devices',
        requiredPermission: 'meinchat.conversations.inspect',
      },
    ],
  },
];

export const meinchatPlusAdminPlugin: IPlugin = {
  name: 'meinchat-plus-admin',
  version: '26.6.1',
  description:
    'Admin surface for E2E chat — device-key registry only (no content access).',

  install(sdk: IPlatformSDK) {
    sdk.addTranslations('en', { meinchatPlusAdmin: (en as any).meinchatPlusAdmin });

    sdk.addRoute({
      path: '/admin/meinchat-plus/devices',
      name: 'meinchat-plus-devices',
      component: () => import('./src/views/MeinchatPlusDevices.vue'),
      meta: { requiresAuth: true, requiredPermission: 'meinchat.conversations.inspect' },
    });

    extensionRegistry.register('meinchat-plus-admin', { navSections: NAV_SECTIONS });
  },

  activate() {
    /* nav is registered at install; nothing to toggle */
  },

  deactivate() {
    /* no-op */
  },
};
