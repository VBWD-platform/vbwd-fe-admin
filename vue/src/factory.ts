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
// fe-core ships its scoped component styles as a separate stylesheet
// (default for vite library builds) — import once at the entry so e.g.
// PaymentDataBlock's flex layout actually applies in the host.
import 'vbwd-view-component/styles';

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
  // NOTE: app.use(router) is deliberately deferred until AFTER plugins have
  // registered their routes. Installing the router plugin triggers Vue
  // Router's initial-navigation resolve, so any plugin route added later
  // isn't known to that first resolve — direct-URL loads of
  // /admin/<plugin-path> would fall through to /admin/login.
  app.use(i18n);

  // Plugin system
  const registry = new PluginRegistry();
  const sdk = new PlatformSDK(i18n);

  // Register and install all plugins.
  //
  // Each step is wrapped so a single plugin's failure doesn't abort the
  // rest — previously a throw here would skip every plugin after the
  // failing one, leaving the admin with ghost entries in plugins.json
  // that the core registry never saw.
  for (const plugin of plugins) {
    try {
      registry.register(plugin);
    } catch (error) {
      console.error(
        `[Admin] Plugin '${plugin.name}' failed registry.register:`,
        error,
      );
    }
  }

  for (const plugin of plugins) {
    try {
      await registry.install(plugin.name, sdk);
    } catch (error) {
      console.error(
        `[Admin] Plugin '${plugin.name}' failed install():`,
        error,
      );
    }
  }

  for (const plugin of plugins) {
    try {
      await registry.activate(plugin.name);
    } catch (error) {
      console.error(
        `[Admin] Plugin '${plugin.name}' failed activate():`,
        error,
      );
    }
  }

  // Register admin extensions from plugins
  for (const [pluginName, extension] of Object.entries(adminExtensions)) {
    extensionRegistry.register(pluginName, extension);
    console.log(`[Admin] Registered extension for plugin: ${pluginName}`);
  }

  // Post-boot diagnostic: catch the case where plugins.json says a plugin
  // is enabled but it never made it into the core registry (almost always
  // an import error hidden earlier in the console). Without this check
  // the only symptom is "Plugin 'X' not found" when the user later hits
  // Activate/Deactivate — too far from the root cause to be useful.
  try {
    const registeredPluginNames = new Set(registry.getAll().map((p) => p.name));
    const manifestEnabledPluginNames = plugins.map((p) => p.name);
    const missingFromCore = manifestEnabledPluginNames.filter(
      (name) => !registeredPluginNames.has(name),
    );
    if (missingFromCore.length > 0) {
      console.error(
        `[Admin] Mismatch: plugins enabled in plugins.json but absent from ` +
        `the core PluginRegistry: ${missingFromCore.join(', ')}. ` +
        `The Settings page will still show these as "Active" but their ` +
        `routes, nav entries, and Activate/Deactivate actions will fail. ` +
        `Check earlier console errors for the failing import.`,
      );
    }
  } catch (error) {
    console.warn('[Admin] Post-boot mismatch check skipped:', error);
  }

  // Inject plugin routes into Vue Router before installing the router on
  // the app — see note above.
  for (const route of sdk.getRoutes()) {
    router.addRoute('admin', route as unknown as import('vue-router').RouteRecordRaw);
  }

  app.use(router);

  // Make available via provide/inject
  app.provide('pluginRegistry', registry);
  app.provide('platformSDK', sdk);

  // Initialize auth state from localStorage
  const authStore = useAuthStore();
  authStore.initAuth();

  // On any 401 (expired or invalid token) wipe auth state and bounce the
  // user to the login page instead of leaving "Invalid or expired token"
  // frozen on the current view. Preserves the intended destination via
  // ?redirect= so they come back after re-auth. Skipped if we're already
  // on /admin/login to avoid reload loops during the login POST itself.
  api.on('token-expired', () => {
    if (router.currentRoute.value.name === 'login') return;
    // Fire-and-forget: logout() also hits /auth/logout which will 401
    // again; that's fine — the .catch inside logout() swallows it.
    authStore.logout();
    router.replace({
      name: 'login',
      query: { redirect: router.currentRoute.value.fullPath },
    });
  });

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
