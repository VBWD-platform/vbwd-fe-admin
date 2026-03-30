import type { IPlugin } from 'vbwd-view-component';
import pluginsManifest from '@plugins/plugins.json';
import type { AdminExtension } from '@/plugins/extensionRegistry';

/**
 * Plugin Registry - Controls which plugins are used
 *
 * Plugins are discovered dynamically from plugins.json.
 * Only enabled plugins are registered.
 *
 * To add a new plugin:
 * 1. Create the plugin in /plugins/{name}/
 * 2. Create index.ts that exports the plugin
 * 3. Add entry to plugins.json with enabled: true
 */

interface PluginManifest {
  plugins: Record<string, {
    enabled: boolean;
    version: string;
    installedAt: string;
    source: string;
  }>;
}

// ============================================================================
// DYNAMIC PLUGIN IMPORTS - Using Vite's import.meta.glob()
// Plugins are discovered and loaded at runtime based on plugins.json
// Only enabled plugins are instantiated and registered
// ============================================================================

// Vite's import.meta.glob() tells Vite to statically analyze all plugin directories
// This allows dynamic imports to work correctly with proper module resolution
// The glob returns an object with module loader functions
// Path: from admin/vue/src/utils/ → ../../../plugins/*/index.ts (three levels up: utils→src→vue→admin, then to admin/plugins/)
const pluginModules = import.meta.glob<any>('../../../plugins/*/index.ts', { eager: false });

// Debug: log available plugin modules with PROMINENT logging
const moduleKeys = Object.keys(pluginModules);
console.log('🔍 [GLOB KEYS] Found glob modules:', moduleKeys);
console.log('🔍 [GLOB DEBUG] pluginModules object:', pluginModules);

/**
 * Get enabled plugins based on plugins.json configuration
 *
 * Plugins are dynamically loaded from the plugin modules map,
 * but only if enabled in plugins.json configuration.
 * To enable/disable plugins, edit plugins.json without touching code.
 *
 * @returns Array of enabled plugin objects
 */
export async function getEnabledPlugins(): Promise<IPlugin[]> {
  try {
    const manifest: PluginManifest = pluginsManifest as PluginManifest;
    const enabledPlugins: IPlugin[] = [];

    // Check localStorage for runtime toggle overrides
    let stateOverrides: Record<string, boolean> = {};
    try {
      stateOverrides = JSON.parse(localStorage.getItem('vbwd_admin_plugin_state') || '{}');
    } catch {
      // ignore
    }

    for (const [pluginName, pluginConfig] of Object.entries(manifest.plugins)) {
      // localStorage override takes precedence over plugins.json
      const isEnabled = pluginName in stateOverrides
        ? stateOverrides[pluginName]
        : pluginConfig.enabled;

      if (!isEnabled) {
        console.debug(`[PluginRegistry] Skipping disabled plugin: ${pluginName}`);
        continue;
      }

      try {
        // Try different path formats to find the module
        // Vite's glob keys can vary, so we need to be flexible
        let moduleLoader = null;
        let foundPath = null;

        // Try the most common path format first
        const possiblePaths = [
          `../../../plugins/${pluginName}/index.ts`,
          `../../plugins/${pluginName}/index.ts`,
          `../plugins/${pluginName}/index.ts`,
        ];

        for (const tryPath of possiblePaths) {
          if (pluginModules[tryPath]) {
            moduleLoader = pluginModules[tryPath];
            foundPath = tryPath;
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
            foundPath = matchingKey;
          }
        }

        if (!moduleLoader) {
          console.warn(`[PluginRegistry] Plugin module not found for: ${pluginName}. Available: ${Object.keys(pluginModules).join(', ')}`);
          continue;
        }

        console.debug(`[PluginRegistry] Found plugin '${pluginName}' at: ${foundPath}`);

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
          console.warn(`[PluginRegistry] Plugin '${pluginName}' loaded but no export with install() found. Skipping.`);
          continue;
        }

        console.debug(`[PluginRegistry] Loaded enabled plugin: ${plugin.name} (v${plugin.version || 'unknown'})`);
        enabledPlugins.push(plugin);
      } catch (error) {
        console.warn(`[PluginRegistry] Failed to load plugin '${pluginName}':`, error);
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
 * Get list of enabled plugin names from manifest
 * Useful for checking if specific plugins are enabled
 */
export function getEnabledPluginNames(): Set<string> {
  try {
    const manifest: PluginManifest = pluginsManifest as PluginManifest;
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
 * Get admin extensions (already registered by admin plugins)
 *
 * Admin plugins register their extensions during install() via extensionRegistry.
 * This function retrieves extensions that have been registered.
 *
 * Note: Extensions are registered by admin plugins at runtime,
 * so this function just returns what's in the registry.
 *
 * @returns All registered admin extensions
 */
export async function getAdminExtensions(): Promise<Record<string, AdminExtension>> {
  // Admin plugins register extensions during install()
  // We retrieve them from the registry (no external loading needed)
  // The registry is populated by plugin install() methods
  return {};
  // NOTE: Extensions are registered directly in extensionRegistry by plugins
  // The pluginSections computed property in UserDetails.vue reads from
  // extensionRegistry.getUserDetailsSections() directly
}

/**
 * @deprecated Use getEnabledPlugins() instead
 */
export async function loadEnabledPlugins(): Promise<IPlugin[]> {
  return await getEnabledPlugins();
}
