import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api';

export interface Vendor {
  id: string;
  display_name: string;
  status: string;
  created_at: string;
}

export type VendorAction = 'approve' | 'suspend';

/**
 * marketplace-admin store — vendor management.
 *
 * Talks to the `marketplace` backend plugin's admin routes
 * (GET/PUT /api/v1/admin/marketplace/vendors). The admin JWT is auto-attached
 * by the shared ApiClient (`@/api`).
 */
export const useMarketplaceAdminStore = defineStore('marketplaceAdmin', () => {
  const vendors = ref<Vendor[]>([]);
  const loading = ref(false);

  function normalize(response: unknown): Vendor[] {
    if (Array.isArray(response)) return response as Vendor[];
    const body = response as { vendors?: Vendor[]; data?: Vendor[] } | null;
    return body?.vendors ?? body?.data ?? [];
  }

  async function fetchVendors(status?: string): Promise<void> {
    loading.value = true;
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const response = await api.get(`/admin/marketplace/vendors${query}`);
      vendors.value = normalize(response);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Apply an approve/suspend action to a vendor and refresh its row.
   * Uses the vendor returned by the PUT when present; otherwise re-fetches.
   */
  async function updateVendor(vendorId: string, action: VendorAction): Promise<void> {
    const response = (await api.put(`/admin/marketplace/vendors/${vendorId}`, {
      action,
    })) as { vendor?: Vendor } | Vendor | null;

    const updated: Vendor | undefined =
      response && 'vendor' in (response as object)
        ? (response as { vendor?: Vendor }).vendor
        : (response as Vendor | null) ?? undefined;

    const index = vendors.value.findIndex((vendor) => vendor.id === vendorId);
    if (updated && updated.id && index !== -1) {
      vendors.value.splice(index, 1, updated);
    } else if (index !== -1) {
      // Server did not echo the row — fall back to updating status locally
      // then reconcile with a fresh fetch.
      await fetchVendors();
    }
  }

  return { vendors, loading, fetchVendors, updateVendor };
});
