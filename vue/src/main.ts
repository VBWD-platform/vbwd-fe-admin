import { createVbwdAdminApp } from './factory';
import { getEnabledPlugins, getAdminExtensions } from '@/utils/pluginLoader';

(async () => {
  // Load plugins from local plugins/ directory (Vite glob)
  let plugins = [];
  try {
    plugins = await getEnabledPlugins();
    console.log(`[Admin] Using ${plugins.length} enabled plugin(s)`);
  } catch (error) {
    console.error('[Admin] Failed to load plugins, continuing without plugins:', error);
  }

  // Load admin extensions from plugins
  let adminExtensions = {};
  try {
    adminExtensions = await getAdminExtensions();
  } catch (error) {
    console.error('[Admin] Failed to load admin extensions:', error);
  }

  const { mount } = await createVbwdAdminApp({ plugins, adminExtensions });
  mount('#app');
})();
