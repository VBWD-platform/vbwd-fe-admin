import { defineStore } from 'pinia';
import { api } from '@/api';

/**
 * A single field descriptor inside a product type's additive cluster.
 * Mirrors the backend `product_type_fields` item shape.
 */
export interface ProductTypeField {
  slug: string;
  type: string;
  label: string;
  required: boolean;
  options: string[];
  help: string | null;
  sort_order: number;
}

/**
 * A shop product type — a named, additive cluster of custom fields.
 * `source="plugin"` types are registered from code and are read-only in the
 * admin UI; `source="admin"` types are created/edited by administrators.
 */
export interface ProductType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  product_type_fields: ProductTypeField[];
  source: 'plugin' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductTypePayload {
  slug?: string;
  name?: string;
  description?: string | null;
  product_type_fields?: ProductTypeField[];
  is_active?: boolean;
}

export const useProductTypeAdminStore = defineStore('shopProductTypeAdmin', {
  state: () => ({
    productTypes: [] as ProductType[],
    activeProductTypes: [] as ProductType[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    /** Active types only, from the public read endpoint (used by the product form). */
    async fetchActiveProductTypes() {
      this.error = null;
      try {
        const response = await api.get('/shop/product-types') as { product_types?: ProductType[] };
        this.activeProductTypes = response.product_types || [];
      } catch (error) {
        this.error = (error as Error).message;
      }
      return this.activeProductTypes;
    },

    /** All types (active + inactive), from the admin endpoint (used by the management view). */
    async fetchProductTypes() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/admin/shop/product-types') as { product_types?: ProductType[] };
        this.productTypes = response.product_types || [];
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
      return this.productTypes;
    },

    async createProductType(data: ProductTypePayload) {
      this.error = null;
      try {
        const response = await api.post('/admin/shop/product-types', data) as { product_type: ProductType };
        if (response.product_type) {
          this.productTypes.push(response.product_type);
        }
        return response.product_type;
      } catch (error) {
        this.error = (error as Error).message;
        throw error;
      }
    },

    async updateProductType(slug: string, data: ProductTypePayload) {
      this.error = null;
      try {
        const response = await api.put(`/admin/shop/product-types/${slug}`, data) as { product_type: ProductType };
        const index = this.productTypes.findIndex(productType => productType.slug === slug);
        if (index >= 0 && response.product_type) {
          this.productTypes[index] = response.product_type;
        }
        return response.product_type;
      } catch (error) {
        this.error = (error as Error).message;
        throw error;
      }
    },

    async deleteProductType(slug: string) {
      this.error = null;
      try {
        await api.delete(`/admin/shop/product-types/${slug}`);
        this.productTypes = this.productTypes.filter(productType => productType.slug !== slug);
      } catch (error) {
        this.error = (error as Error).message;
        throw error;
      }
    },
  },
});
