import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry, PlatformSDK } from 'vbwd-view-component';
import { meinchatPlusAdminPlugin } from '../../index';

describe('Meinchat-plus Admin Plugin', () => {
  let registry: PluginRegistry;
  let sdk: PlatformSDK;

  beforeEach(() => {
    registry = new PluginRegistry();
    sdk = new PlatformSDK();
  });

  it('declares correct metadata', () => {
    expect(meinchatPlusAdminPlugin.name).toBe('meinchat-plus-admin');
    expect(meinchatPlusAdminPlugin.version).toBe('1.0.0');
  });

  it('registers the device-key route gated by the inspect permission', async () => {
    registry.register(meinchatPlusAdminPlugin);
    await registry.installAll(sdk);
    const route = sdk.getRoutes().find((r) => r.name === 'meinchat-plus-devices');
    expect(route).toBeDefined();
    expect(route?.meta?.requiredPermission).toBe('meinchat.conversations.inspect');
  });

  it('loads the en locale with the admin namespace', async () => {
    registry.register(meinchatPlusAdminPlugin);
    await registry.installAll(sdk);
    const translations = sdk.getTranslations() as Record<string, any>;
    expect(translations.en?.meinchatPlusAdmin?.title).toBeDefined();
  });
});
