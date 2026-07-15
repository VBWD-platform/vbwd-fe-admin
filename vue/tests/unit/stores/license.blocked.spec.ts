import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLicenseStore } from '@/stores/license';

/**
 * The license store carries the global "CMS is license-blocked" flag that the
 * admin layout renders as a prominent "License expired" state. A CMS admin API
 * 402 flips it via `markLicenseBlocked('cms')`; it starts clear.
 */
describe('license store — CMS license-block flag', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts clear (no feature blocked)', () => {
    const store = useLicenseStore();
    expect(store.blockedFeature).toBeNull();
    expect(store.isLicenseBlocked).toBe(false);
  });

  it('markLicenseBlocked("cms") sets the flag and records the feature', () => {
    const store = useLicenseStore();
    store.markLicenseBlocked('cms');
    expect(store.blockedFeature).toBe('cms');
    expect(store.isLicenseBlocked).toBe(true);
  });

  it('clearLicenseBlock() resets the flag', () => {
    const store = useLicenseStore();
    store.markLicenseBlocked('cms');
    store.clearLicenseBlock();
    expect(store.blockedFeature).toBeNull();
    expect(store.isLicenseBlocked).toBe(false);
  });

  it('reset() also clears the license-block flag', () => {
    const store = useLicenseStore();
    store.markLicenseBlocked('cms');
    store.reset();
    expect(store.blockedFeature).toBeNull();
    expect(store.isLicenseBlocked).toBe(false);
  });
});
