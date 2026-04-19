/**
 * Unit tests for runtime plugin manifest loading logic (fe-admin).
 *
 * Tests fetchPluginManifest and fetchPluginConfigs directly since
 * pluginLoader.ts uses Vite-specific features that can't run in vitest.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchPluginManifest, fetchPluginConfigs } from 'vbwd-view-component';
import type { PluginManifest, PluginManifestEntry } from 'vbwd-view-component';

describe('Runtime plugin manifest loading (fe-admin)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchPluginManifest returns runtime manifest when fetch succeeds', async () => {
    const runtimeManifest: PluginManifest = {
      plugins: {
        'cms-admin': { enabled: true, version: '1.0.0', source: 'local' },
        'booking': { enabled: true, version: '1.0.0', source: 'local' },
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(runtimeManifest),
    } as Response);

    const result = await fetchPluginManifest('/plugins.json');

    expect(result).toEqual(runtimeManifest);
  });

  it('fetchPluginManifest falls back to build-time manifest on failure', async () => {
    const fallback: PluginManifest = {
      plugins: {
        'analytics-widget': { enabled: true, version: '1.0.0', source: 'local' },
      },
    };

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await fetchPluginManifest('/plugins.json', fallback);

    expect(result).toEqual(fallback);
  });

  it('fetchPluginConfigs returns runtime configs when fetch succeeds', async () => {
    const configs = {
      'analytics-widget': { refreshInterval: 60 },
      'booking': { defaultTimezone: 'Europe/Berlin' },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(configs),
    } as Response);

    const result = await fetchPluginConfigs('/config.json');

    expect(result).toEqual(configs);
    expect(result['analytics-widget']).toEqual({ refreshInterval: 60 });
  });

  it('fetchPluginConfigs returns empty object on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await fetchPluginConfigs('/config.json');

    expect(result).toEqual({});
  });

  it('runtime manifest correctly filters enabled/disabled plugins', async () => {
    const manifest: PluginManifest = {
      plugins: {
        'subscription-admin': { enabled: true, version: '1.0.0', source: 'local' },
        'taro-admin': { enabled: false, version: '1.0.0', source: 'local' },
        'cms-admin': { enabled: true, version: '1.0.0', source: 'local' },
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manifest),
    } as Response);

    const result = await fetchPluginManifest('/plugins.json');

    const enabled = Object.entries(result.plugins)
      .filter(([, config]) => (config as PluginManifestEntry).enabled)
      .map(([name]) => name);

    expect(enabled).toEqual(['subscription-admin', 'cms-admin']);
  });

  it('runtime manifest with zero plugins returns empty plugins object', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ plugins: {} }),
    } as Response);

    const result = await fetchPluginManifest('/plugins.json');

    expect(result.plugins).toEqual({});
  });
});
