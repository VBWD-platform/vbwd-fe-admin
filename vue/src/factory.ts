/**
 * Factory function to create and configure the VBWD Admin App.
 *
 * Used by:
 * - SDK developers: called from main.ts with local plugin glob
 * - Platform users: called from their own main.ts with their plugins
 */
import { createApp, type App } from 'vue';
import { createPinia, type Pinia } from 'pinia';
import AppComponent from './App.vue';
import router from './router';
import { api } from '@/api';
import {
  configureAuthStore,
  configureEventBus,
  useAuthStore,
  PluginRegistry,
  PlatformSDK
} from 'vbwd-view-component';
import type { IPlugin } from 'vbwd-view-component';
import i18n, { initLocale, setLocale, type LocaleCode, availableLocales } from '@/i18n';
import { extensionRegistry } from '@/plugins/extensionRegistry';
import type { Router } from 'vue-router';

export interface AdminExtensionMap {
  [pluginName: string]: import('@/plugins/extensionRegistry').AdminExtension;
}

export interface VbwdAdminAppOptions {
  plugins?: IPlugin[];
  adminExtensions?: AdminExtensionMap;
  mountSelector?: string;
}

export interface VbwdAdminAppInstance {
  app: App;
  router: Router;
  pinia: Pinia;
  registry: PluginRegistry;
  sdk: PlatformSDK;
  mount: (selector?: string) => void;
}

export async function createVbwdAdminApp(
  options: VbwdAdminAppOptions = {}
): Promise<VbwdAdminAppInstance> {
  const { plugins = [], adminExtensions = {}, mountSelector = '#app' } = options;

  // Configure auth store with admin-specific settings
  configureAuthStore({
    storageKey: 'admin_token',
    apiClient: api,
    loginEndpoint: '/auth/login',
    logoutEndpoint: '/auth/logout',
    refreshEndpoint: '/auth/refresh',
    profileEndpoint: '/auth/me',
  });

  // Configure EventBus for frontend-to-backend event delivery
  configureEventBus({
    apiClient: api,
    eventsEndpoint: '/events',
    autoSendToBackend: true,
  });

  const app = createApp(AppComponent);
  const pinia = createPinia();

  app.use(pinia);
  app.use(router);
  app.use(i18n);

  // Plugin system
  const registry = new PluginRegistry();
  const sdk = new PlatformSDK(i18n);

  // Register and install all plugins
  for (const plugin of plugins) {
    registry.register(plugin);
  }

  await registry.installAll(sdk);

  // Activate all loaded plugins
  for (const plugin of plugins) {
    await registry.activate(plugin.name);
  }

  // Register admin extensions from plugins
  for (const [pluginName, extension] of Object.entries(adminExtensions)) {
    extensionRegistry.register(pluginName, extension);
    console.log(`[Admin] Registered extension for plugin: ${pluginName}`);
  }

  // Inject plugin routes into Vue Router
  for (const route of sdk.getRoutes()) {
    router.addRoute('admin', route as unknown as import('vue-router').RouteRecordRaw);
  }

  // Make available via provide/inject
  app.provide('pluginRegistry', registry);
  app.provide('platformSDK', sdk);

  // Initialize auth state from localStorage
  const authStore = useAuthStore();
  authStore.initAuth();

  // Initialize locale from stored preference
  initLocale();

  // Load user's language preference from backend if authenticated
  if (authStore.isAuthenticated) {
    try {
      const response = await api.get('/admin/profile') as { user: { details?: { config?: { language?: string } } } };
      const language = response.user?.details?.config?.language;
      if (language && availableLocales.includes(language as LocaleCode)) {
        setLocale(language as LocaleCode);
      }
    } catch {
      // Ignore errors — use localStorage preference
    }
  }

  const mount = (selector?: string) => {
    app.mount(selector || mountSelector);
  };

  return { app, router, pinia, registry, sdk, mount };
}
