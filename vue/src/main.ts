import { createVbwdAdminApp } from './factory';
import type { AdminExtensionMap } from './factory';
import { getEnabledPlugins, getAdminExtensions } from '@/utils/pluginLoader';
import type { IPlugin } from 'vbwd-view-component';

(async () => {
  // Load plugins from local plugins/ directory (Vite glob)
  let plugins: IPlugin[] = [];
  try {
    plugins = await getEnabledPlugins();
    console.log(`[Admin] Using ${plugins.length} enabled plugin(s)`);
  } catch (error) {
    console.error('[Admin] Failed to load plugins, continuing without plugins:', error);
  }

  // Load admin extensions from plugins
  let adminExtensions: AdminExtensionMap = {};
  try {
    adminExtensions = await getAdminExtensions();
  } catch (error) {
    console.error('[Admin] Failed to load admin extensions:', error);
  }

  const { mount } = await createVbwdAdminApp({ plugins, adminExtensions });
  mount('#app');
})();
