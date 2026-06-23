import { defineStore } from 'pinia';
import { api } from '@/api';
import type { ProductClass } from '../pharmaFields';

export interface PharmaProfile {
  product_class: ProductClass | null;
  active_substances: string[];
  strength: string | null;
  pharmaceutical_form: string | null;
  atc_code: string | null;
  marketing_authorisation_holder: string | null;
  device_marking: string | null;
  leaflet_url: string | null;
  smpc_url: string | null;
  pharmacovigilance_url: string | null;
  storage_conditions: string | null;
  warnings: string | null;
  age_restriction_years: number | null;
  max_quantity_per_order: number | null;
  professional_only: boolean;
  withdrawal_right_exempt: boolean;
}

export interface PharmaProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  primary_image_url: string | null;
  pharma_profile: PharmaProfile;
}

export interface PharmaVariant {
  id: string;
  name: string;
  sku: string | null;
  price: string | null;
  price_float?: number;
  attributes: Record<string, string>;
  is_active: boolean;
  weight: number | null;
}

export interface PharmaProduct extends PharmaProductListItem {
  description: string | null;
  is_active: boolean;
  is_digital: boolean;
  has_variants: boolean;
  tax_class: string;
  categories: Array<{ id: string; name: string; slug: string }>;
  images: Array<{ id: string; url: string; alt: string; is_primary: boolean }>;
  variants: PharmaVariant[];
}

export interface PharmaRegion {
  country_code: string;
  name: string;
  locale: string;
  display_currency: string;
  national_code_scheme: string;
  national_register_url: string;
  registered_pharmacy_logo_url: string;
  pharmacovigilance_url: string;
  withdrawal_right_copy: string;
  default_age_restriction_years: number;
  default_max_quantity_per_order: number;
  regime: string;
  operator_verify: boolean;
}

/** A save rejected by the backend's RequiredFieldsByClass policy (400). */
export interface PharmaSaveRejection {
  message: string;
  missing: string[];
}

interface MissingError {
  message?: string;
  missing?: unknown;
}

/**
 * The backend returns `400 {error, missing:[...]}`. The shared ApiClient maps the
 * `error` string onto `Error.message` but drops the `missing` array, so we parse
 * the human message back into the field list (the message lists exactly the
 * missing keys, e.g. "Class 'OTC' requires: active_substances, strength").
 */
function toRejection(error: unknown): PharmaSaveRejection {
  const message = (error as MissingError)?.message ?? 'Save failed';
  const raw = (error as MissingError)?.missing;
  let missing: string[] = Array.isArray(raw) ? raw.map(String) : [];
  if (missing.length === 0) {
    const match = message.match(/requires:\s*(.+)$/i);
    if (match) {
      missing = match[1].split(',').map((field) => field.trim()).filter(Boolean);
    }
  }
  return { message, missing };
}

export const usePharmaAdminStore = defineStore('shopPharmaAdmin', {
  state: () => ({
    products: [] as PharmaProductListItem[],
    selectedProduct: null as PharmaProduct | null,
    region: null as PharmaRegion | null,
    loading: false,
    error: null as string | null,
    lastRejection: null as PharmaSaveRejection | null,
  }),

  getters: {
    /** Products grouped by product_class, in catalogue order. */
    productsByClass(state): Record<string, PharmaProductListItem[]> {
      const grouped: Record<string, PharmaProductListItem[]> = {};
      for (const product of state.products) {
        const klass = product.pharma_profile?.product_class ?? 'UNCLASSIFIED';
        (grouped[klass] ||= []).push(product);
      }
      return grouped;
    },
  },

  actions: {
    async fetchRegion() {
      try {
        const response = (await api.get('/pharma/region')) as { region: PharmaRegion };
        this.region = response.region;
        return response.region;
      } catch (error) {
        this.error = (error as Error).message;
        return null;
      }
    },

    async fetchProducts() {
      this.loading = true;
      this.error = null;
      try {
        const response = (await api.get('/admin/pharma/products')) as {
          products: PharmaProductListItem[];
        };
        this.products = response.products;
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
    },

    async fetchProduct(productId: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = (await api.get(`/admin/pharma/products/${productId}`)) as {
          product: PharmaProduct;
        };
        this.selectedProduct = response.product;
        return response.product;
      } catch (error) {
        this.error = (error as Error).message;
        return null;
      } finally {
        this.loading = false;
      }
    },

    async createProduct(payload: Record<string, unknown>) {
      this.lastRejection = null;
      try {
        const response = (await api.post('/admin/pharma/products', payload)) as {
          product: PharmaProduct;
        };
        return response.product;
      } catch (error) {
        this.lastRejection = toRejection(error);
        throw error;
      }
    },

    async updateProduct(productId: string, payload: Record<string, unknown>) {
      this.lastRejection = null;
      try {
        const response = (await api.put(`/admin/pharma/products/${productId}`, payload)) as {
          product: PharmaProduct;
        };
        return response.product;
      } catch (error) {
        this.lastRejection = toRejection(error);
        throw error;
      }
    },

    async deleteProduct(productId: string) {
      await api.delete(`/admin/pharma/products/${productId}`);
      this.products = this.products.filter((product) => product.id !== productId);
    },

    // ── Pack variants (driven through the shop variant authoring API, S101.0) ──

    async fetchVariants(productId: string) {
      const response = (await api.get(
        `/admin/shop/products/${productId}/variants`,
      )) as { variants: PharmaVariant[] };
      return response.variants;
    },

    async createVariant(productId: string, payload: Record<string, unknown>) {
      const response = (await api.post(
        `/admin/shop/products/${productId}/variants`,
        payload,
      )) as { variant: PharmaVariant };
      return response.variant;
    },

    async updateVariant(productId: string, variantId: string, payload: Record<string, unknown>) {
      const response = (await api.put(
        `/admin/shop/products/${productId}/variants/${variantId}`,
        payload,
      )) as { variant: PharmaVariant };
      return response.variant;
    },

    async deleteVariant(productId: string, variantId: string) {
      await api.delete(`/admin/shop/products/${productId}/variants/${variantId}`);
    },

    async reorderVariants(productId: string, variantIds: string[]) {
      await api.post(`/admin/shop/products/${productId}/variants/reorder`, {
        variant_ids: variantIds,
      });
    },
  },
});
