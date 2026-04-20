import { defineStore } from 'pinia';
import { fetchPluginManifest, fetchPluginConfigs } from 'vbwd-view-component';
import type { PluginManifest } from 'vbwd-view-component';
import buildTimeRegistry from '@plugins/plugins.json';
import buildTimeConfigs from '@plugins/config.json';

export interface PluginEntry {
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  installedAt: string;
  source: string;
  status: 'active' | 'inactive' | 'error';
}

export interface PluginConfigField {
  type: 'string' | 'number' | 'boolean' | 'select';
  default: unknown;
  description: string;
}

export interface AdminConfigField {
  key: string;
  label: string;
  component: 'input' | 'checkbox' | 'select' | 'textarea';
  inputType?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

export interface AdminConfigTab {
  id: string;
  label: string;
  fields: AdminConfigField[];
}

export interface PluginDetail {
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  status: 'active' | 'inactive' | 'error';
  configSchema: Record<string, PluginConfigField>;
  adminConfig: { tabs: AdminConfigTab[] };
  savedConfig: Record<string, unknown>;
}

interface PluginRegistryEntry {
  enabled: boolean;
  version: string;
  installedAt: string;
  source: string;
}

type PluginRegistryFile = {
  plugins: Record<string, PluginRegistryEntry>;
};

let registry = buildTimeRegistry as PluginRegistryFile;
let configs = buildTimeConfigs as Record<string, Record<string, unknown>>;
let manifestLoaded = false;

async function ensureManifestLoaded(): Promise<void> {
  if (manifestLoaded) return;
  // Admin app is served under /admin/, so the manifest files live at
  // /admin/plugins.json and /admin/config.json — not at the root.
  const base = import.meta.env.BASE_URL;
  const runtimeManifest = await fetchPluginManifest(`${base}plugins.json`, buildTimeRegistry as PluginManifest);
  registry = { plugins: runtimeManifest.plugins as unknown as Record<string, PluginRegistryEntry> };
  configs = await fetchPluginConfigs(`${base}config.json`);
  manifestLoaded = true;
}

const PLUGIN_STATE_KEY = 'vbwd_admin_plugin_state';

/**
 * Persist plugin enabled/disabled state to localStorage.
 * On reload, pluginLoader checks this before loading plugins.
 */
function _persistPluginState(name: string, enabled: boolean): void {
  try {
    const stored = JSON.parse(localStorage.getItem(PLUGIN_STATE_KEY) || '{}');
    stored[name] = enabled;
    localStorage.setItem(PLUGIN_STATE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage unavailable
  }
}

/**
 * Get persisted plugin state overrides from localStorage.
 */
export function getPersistedPluginState(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(PLUGIN_STATE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Call a plugin's activate() or deactivate() lifecycle hook.
 */
function _callPluginLifecycle(name: string, method: 'activate' | 'deactivate'): void {
  for (const [path, mod] of Object.entries(pluginIndexModules)) {
    if (!path.includes(`/${name}/`)) continue;
    for (const exportVal of Object.values(mod)) {
      if (
        exportVal &&
        typeof exportVal === 'object' &&
        'name' in exportVal &&
        (exportVal as { name: string }).name === name &&
        method in exportVal &&
        typeof (exportVal as Record<string, unknown>)[method] === 'function'
      ) {
        (exportVal as unknown as Record<string, () => void>)[method]();
        return;
      }
    }
  }
}

// Dynamic imports for per-plugin config and admin-config JSON files
const pluginConfigModules = import.meta.glob('@plugins/*/config.json', { eager: true }) as Record<string, { default: Record<string, PluginConfigField> }>;
const pluginAdminConfigModules = import.meta.glob('@plugins/*/admin-config.json', { eager: true }) as Record<string, { default: { tabs: AdminConfigTab[] } }>;
const pluginIndexModules = import.meta.glob('@plugins/*/index.ts', { eager: true }) as Record<string, { [key: string]: { name: string; version: string; description?: string } }>;

function getPluginDescription(name: string): string {
  for (const [path, mod] of Object.entries(pluginIndexModules)) {
    if (path.includes(`/${name}/`)) {
      // Find the exported plugin object
      for (const exportVal of Object.values(mod)) {
        if (exportVal && typeof exportVal === 'object' && 'name' in exportVal && exportVal.name === name) {
          return (exportVal as { description?: string }).description || '';
        }
      }
    }
  }
  return '';
}

function getPluginConfigSchema(name: string): Record<string, PluginConfigField> {
  for (const [path, mod] of Object.entries(pluginConfigModules)) {
    if (path.includes(`/${name}/`)) {
      return mod.default || mod as unknown as Record<string, PluginConfigField>;
    }
  }
  return {};
}

function getPluginAdminConfig(name: string): { tabs: AdminConfigTab[] } {
  for (const [path, mod] of Object.entries(pluginAdminConfigModules)) {
    if (path.includes(`/${name}/`)) {
      return mod.default || mod as unknown as { tabs: AdminConfigTab[] };
    }
  }
  return { tabs: [] };
}

export const usePluginsStore = defineStore('plugins', {
  state: () => ({
    plugins: [] as PluginEntry[],
    currentPlugin: null as PluginDetail | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getByName: (state) => (name: string): PluginEntry | undefined => {
      return state.plugins.find(p => p.name === name);
    },
  },

  actions: {
    async fetchPlugins(): Promise<PluginEntry[]> {
      this.loading = true;
      this.error = null;

      try {
        await ensureManifestLoaded();
        const entries: PluginEntry[] = Object.entries(registry.plugins).map(([name, entry]) => ({
          name,
          version: entry.version,
          description: getPluginDescription(name),
          enabled: entry.enabled,
          installedAt: entry.installedAt,
          source: entry.source,
          status: entry.enabled ? 'active' as const : 'inactive' as const,
        }));
        this.plugins = entries;
        return entries;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch plugins';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchPluginDetail(name: string): Promise<PluginDetail> {
      this.loading = true;
      this.error = null;

      try {
        await ensureManifestLoaded();
        const entry = registry.plugins[name];
        if (!entry) {
          throw new Error(`Plugin "${name}" not found`);
        }

        const configSchema = getPluginConfigSchema(name);
        const adminConfig = getPluginAdminConfig(name);
        const saved = configs[name] || {};

        const detail: PluginDetail = {
          name,
          version: entry.version,
          description: getPluginDescription(name),
          enabled: entry.enabled,
          status: entry.enabled ? 'active' : 'inactive',
          configSchema,
          adminConfig,
          savedConfig: saved,
        };

        this.currentPlugin = detail;
        return detail;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch plugin details';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async savePluginConfig(name: string, config: Record<string, unknown>): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        // Update local saved configs
        configs[name] = { ...config };
        if (this.currentPlugin && this.currentPlugin.name === name) {
          this.currentPlugin.savedConfig = { ...config };
        }
      } catch (error) {
        this.error = (error as Error).message || 'Failed to save plugin config';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async activatePlugin(name: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        // Update local registry
        if (registry.plugins[name]) {
          registry.plugins[name].enabled = true;
        }
        const plugin = this.plugins.find(p => p.name === name);
        if (plugin) {
          plugin.enabled = true;
          plugin.status = 'active';
        }
        if (this.currentPlugin && this.currentPlugin.name === name) {
          this.currentPlugin.enabled = true;
          this.currentPlugin.status = 'active';
        }

        // Call the actual plugin activate() lifecycle hook
        _callPluginLifecycle(name, 'activate');

        // Persist to localStorage so reload respects toggle
        _persistPluginState(name, true);
      } catch (error) {
        this.error = (error as Error).message || 'Failed to activate plugin';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deactivatePlugin(name: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        // Call the actual plugin deactivate() lifecycle hook
        _callPluginLifecycle(name, 'deactivate');

        if (registry.plugins[name]) {
          registry.plugins[name].enabled = false;
        }
        const plugin = this.plugins.find(p => p.name === name);
        if (plugin) {
          plugin.enabled = false;
          plugin.status = 'inactive';
        }
        if (this.currentPlugin && this.currentPlugin.name === name) {
          this.currentPlugin.enabled = false;
          this.currentPlugin.status = 'inactive';
        }

        // Persist to localStorage so reload respects toggle
        _persistPluginState(name, false);
      } catch (error) {
        this.error = (error as Error).message || 'Failed to deactivate plugin';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async uninstallPlugin(name: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        delete registry.plugins[name];
        this.plugins = this.plugins.filter(p => p.name !== name);
        if (this.currentPlugin && this.currentPlugin.name === name) {
          this.currentPlugin = null;
        }
      } catch (error) {
        this.error = (error as Error).message || 'Failed to uninstall plugin';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.plugins = [];
      this.currentPlugin = null;
      this.error = null;
      this.loading = false;
    },
  },
});
