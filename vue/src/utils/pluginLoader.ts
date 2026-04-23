import type { IPlugin, PluginManifest, PluginManifestEntry } from 'vbwd-view-component';
import { fetchPluginManifest } from 'vbwd-view-component';
import buildTimeManifest from '@plugins/plugins.json';
import type { AdminExtension } from '@/plugins/extensionRegistry';

/**
 * Plugin Registry - Controls which plugins are used
 *
 * Plugins are discovered via Vite's import.meta.glob at build time (all
 * plugin code is in the bundle). The **manifest** (which plugins to activate)
 * is fetched at runtime from /plugins.json, falling back to the build-time
 * import when the fetch fails (e.g., dev server without a mounted file).
 *
 * To add a new plugin:
 * 1. Create the plugin in /plugins/{name}/
 * 2. Create index.ts that exports the plugin
 * 3. Add entry to plugins.json with enabled: true
 */

// ============================================================================
// DYNAMIC PLUGIN IMPORTS - Using Vite's import.meta.glob()
// Plugins are discovered and loaded at runtime based on plugins.json
// Only enabled plugins are instantiated and registered
// ============================================================================

const pluginModules = import.meta.glob<any>('../../../plugins/*/index.ts', { eager: false });

const moduleKeys = Object.keys(pluginModules);
console.log('🔍 [GLOB KEYS] Found glob modules:', moduleKeys);

/** Cached manifest after first load */
let cachedManifest: PluginManifest | null = null;

/**
 * Get enabled plugins based on runtime manifest.
 * Fetches /plugins.json at runtime; falls back to build-time manifest.
 * Only enabled plugins are instantiated and registered.
 *
 * @returns Array of enabled plugin objects
 */
export async function getEnabledPlugins(): Promise<IPlugin[]> {
  try {
    const manifestPath = `${import.meta.env.BASE_URL}plugins.json`;
    const manifest = await fetchPluginManifest(manifestPath, buildTimeManifest as PluginManifest);
    cachedManifest = manifest;
    const enabledPlugins: IPlugin[] = [];

    // Self-healing: strip any legacy per-browser plugin-state overrides.
    // The original code persisted Activate/Deactivate clicks into
    // localStorage under 'vbwd_admin_plugin_state' and read them back on
    // every boot. That made plugin enablement depend on which browser tab
    // you clicked in — different users, different devices, or even an
    // incognito window would see different "enabled" plugins. The server
    // container is the only authoritative source (plugins.json), so the
    // client-side cache is removed and any stale entries are deleted once.
    try {
      if (localStorage.getItem('vbwd_admin_plugin_state')) {
        console.info(
          '[PluginRegistry] Removing legacy localStorage plugin-state ' +
          "overrides ('vbwd_admin_plugin_state'). Plugin enablement is now " +
          'server-side (plugins.json) only.',
        );
        localStorage.removeItem('vbwd_admin_plugin_state');
      }
    } catch {
      // localStorage unavailable — nothing to clean up
    }

    for (const [pluginName, pluginConfig] of Object.entries(manifest.plugins) as [string, PluginManifestEntry][]) {
      if (!pluginConfig.enabled) {
        console.debug(`[PluginRegistry] Skipping disabled plugin (plugins.json): ${pluginName}`);
        continue;
      }

      try {
        // Try different path formats to find the module
        let moduleLoader = null;

        const possiblePaths = [
          `../../../plugins/${pluginName}/index.ts`,
          `../../plugins/${pluginName}/index.ts`,
          `../plugins/${pluginName}/index.ts`,
        ];

        for (const tryPath of possiblePaths) {
          if (pluginModules[tryPath]) {
            moduleLoader = pluginModules[tryPath];
            break;
          }
        }

        // Also try to find by matching the plugin name in available keys
        if (!moduleLoader) {
          const matchingKey = Object.keys(pluginModules).find(key =>
            key.includes(`/${pluginName}/index.ts`)
          );
          if (matchingKey) {
            moduleLoader = pluginModules[matchingKey];
          }
        }

        if (!moduleLoader) {
          console.warn(`[PluginRegistry] Plugin module not found for: ${pluginName}. Available: ${Object.keys(pluginModules).join(', ')}`);
          continue;
        }

        // Dynamically load the module (only for enabled plugins)
        const pluginModule = await moduleLoader();
        // Support both default and named exports
        let plugin = pluginModule.default;
        if (!plugin) {
          // Fallback: find first named export with .install method
          const namedExport = Object.values(pluginModule).find(
            (exp: any) => exp && typeof exp === 'object' && typeof exp.install === 'function'
          );
          if (namedExport) {
            plugin = namedExport;
          }
        }

        if (!plugin) {
          console.error(
            `[PluginRegistry] Plugin '${pluginName}' loaded but no export ` +
            `with install() found. The module must export the plugin as ` +
            `\`export default\` or as a named export containing .install(). ` +
            `Nav entries and routes for this plugin will NOT work.`,
          );
          continue;
        }

        console.debug(`[PluginRegistry] Loaded enabled plugin: ${plugin.name} (v${plugin.version || 'unknown'})`);
        enabledPlugins.push(plugin);
      } catch (error) {
        // Escalated to console.error — a silent warn here has been the #1
        // cause of "my plugin disappeared from the sidebar" confusion:
        // plugins.json still lists it as enabled, the Settings page still
        // shows the toggle as on, but the core registry never saw it, so
        // Activate/Deactivate later throws "Plugin X not found".
        console.error(
          `[PluginRegistry] Failed to load plugin '${pluginName}':`,
          error,
          `\nCheck the plugin's index.ts for an import error. The plugin ` +
          `will appear enabled in /admin/settings/plugins but its nav ` +
          `entries and routes will NOT work.`,
        );
      }
    }

    console.log(`[PluginRegistry] Total enabled plugins: ${enabledPlugins.length}`);
    return enabledPlugins;
  } catch (error) {
    console.error('[PluginRegistry] Failed to get enabled plugins:', error);
    return [];
  }
}

/**
 * Get list of enabled plugin names from manifest.
 * Uses cached runtime manifest if available, otherwise falls back to build-time.
 */
export function getEnabledPluginNames(): Set<string> {
  try {
    const manifest = cachedManifest ?? (buildTimeManifest as PluginManifest);
    return new Set(
      Object.entries(manifest.plugins)
        .filter(([, config]) => config.enabled)
        .map(([name]) => name)
    );
  } catch (error) {
    console.error('[PluginRegistry] Failed to get enabled plugin names:', error);
    return new Set();
  }
}

/**
 * Get the cached runtime manifest.
 * Returns null if getEnabledPlugins() has not been called yet.
 */
export function getCachedManifest(): PluginManifest | null {
  return cachedManifest;
}

/**
 * Get admin extensions (already registered by admin plugins)
 *
 * Admin plugins register their extensions during install() via extensionRegistry.
 * This function retrieves extensions that have been registered.
 *
 * @returns All registered admin extensions
 */
export async function getAdminExtensions(): Promise<Record<string, AdminExtension>> {
  return {};
}

/**
 * @deprecated Use getEnabledPlugins() instead
 */
export async function loadEnabledPlugins(): Promise<IPlugin[]> {
  return await getEnabledPlugins();
}
