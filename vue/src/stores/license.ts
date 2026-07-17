import { defineStore } from 'pinia';
import {
  getStatus,
  addKeyByCode,
  addKeyByEnvelope,
  removeKey,
  type AddKeyResult,
  type LicenseKeyRow,
  type LicenseResource,
  type LicenseStatusPayload,
} from '@/api/license';

/**
 * License store (S135-CLIENT §2.5).
 *
 * Wraps the `@/api/license` client for the Settings → License tab. Holds the
 * server-reported status payload and exposes add/remove actions that refetch so
 * the tab always mirrors the backend. Purely agnostic: no product or feature is
 * named here — the payload drives the UI.
 */
export const useLicenseStore = defineStore('license', {
  state: () => ({
    status: null as LicenseStatusPayload | null,
    loading: false,
    error: null as string | null,
    // Global "a licensed feature is unavailable" flag, driven by a runtime API
    // 402 (see `@/api` AdminApiClient). Holds the blocked feature name (e.g.
    // 'cms') or null when nothing is blocked. The admin layout renders this as
    // a prominent "License expired" banner.
    blockedFeature: null as string | null,
  }),

  getters: {
    keys(state): LicenseKeyRow[] {
      return state.status?.keys ?? [];
    },
    resources(state): LicenseResource[] {
      return state.status?.resources ?? [];
    },
    isDegraded(state): boolean {
      return state.status?.degraded ?? false;
    },
    isLicenseBlocked(state): boolean {
      return state.blockedFeature !== null;
    },
  },

  actions: {
    async fetchStatus(): Promise<LicenseStatusPayload> {
      this.loading = true;
      this.error = null;
      try {
        const payload = await getStatus();
        this.status = payload;
        return payload;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to load license status';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async addByCode(code: string): Promise<AddKeyResult> {
      const result = await addKeyByCode(code);
      await this.fetchStatus();
      return result;
    },

    async addByEnvelope(envelope: string): Promise<AddKeyResult> {
      const result = await addKeyByEnvelope(envelope);
      await this.fetchStatus();
      return result;
    },

    async remove(keyId: string): Promise<void> {
      await removeKey(keyId);
      await this.fetchStatus();
    },

    /**
     * Record that a licensed feature was blocked at runtime (API 402). Called
     * from the app's `onLicenseBlocked` wiring; drives the "License expired"
     * banner in the admin layout.
     */
    markLicenseBlocked(feature: string): void {
      this.blockedFeature = feature;
    },

    clearLicenseBlock(): void {
      this.blockedFeature = null;
    },

    reset(): void {
      this.status = null;
      this.error = null;
      this.loading = false;
      this.blockedFeature = null;
    },
  },
});
