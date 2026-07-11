import { defineStore } from 'pinia';
import { api } from '@/api';

export interface ProductAdmin {
  id: string;
  name: string;
  slug: string;
  description: string;
  sku: string | null;
  price: string;
  currency: string;
  price_float: number;
  is_active: boolean;
  has_variants: boolean;
  weight: string | null;
  tax_class: string;
  primary_image_url: string | null;
  images: Array<{ id: string; url: string; alt: string; is_primary: boolean }>;
  variants: Array<{ id: string; name: string; sku: string | null; price: string | null; attributes: Record<string, string> }>;
  categories: Array<{ id: string; name: string; slug: string }>;
  tax_ids: string[];
  taxes: Array<{ id: string; code: string; name: string; rate: string }>;
  created_at: string;
}

/** Result envelope returned by every shop products bulk endpoint. */
export interface BulkResult {
  updated: number;
  skipped: number;
}

export type BulkAssignMode = 'add' | 'replace';

export const useProductAdminStore = defineStore('shopProductAdmin', {
  state: () => ({
    products: [] as ProductAdmin[],
    selectedProduct: null as ProductAdmin | null,
    loading: false,
    error: null as string | null,
    total: 0,
    page: 1,
    perPage: 25,
  }),

  actions: {
    async fetchProducts(page = 1, perPage = 25) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/admin/shop/products', {
          params: { page, per_page: perPage },
        }) as { products: ProductAdmin[]; page: number; per_page: number };
        this.products = response.products;
        this.page = response.page;
        this.perPage = response.per_page;
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
        const response = await api.get(`/admin/shop/products/${productId}`) as { product: ProductAdmin };
        this.selectedProduct = response.product;
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
    },

    async createProduct(data: Partial<ProductAdmin>) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/admin/shop/products', data) as { product: ProductAdmin };
        this.products.unshift(response.product);
        return response.product;
      } catch (error) {
        this.error = (error as Error).message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateProduct(productId: string, data: Partial<ProductAdmin>) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.put(`/admin/shop/products/${productId}`, data) as { product: ProductAdmin };
        const index = this.products.findIndex(p => p.id === productId);
        if (index >= 0) this.products[index] = response.product;
        this.selectedProduct = response.product;
        return response.product;
      } catch (error) {
        this.error = (error as Error).message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchProductImages(productId: string) {
      const response = await api.get(`/admin/shop/products/${productId}/images`) as { images: ProductAdmin['images'] };
      return response.images;
    },

    async uploadProductImage(productId: string, file: File) {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/admin/shop/products/${productId}/images`, formData) as { image: ProductAdmin['images'][0] };
      return response.image;
    },

    async setProductImagePrimary(productId: string, imageId: string) {
      await api.post(`/admin/shop/products/${productId}/images/${imageId}/primary`);
    },

    async deleteProductImage(productId: string, imageId: string) {
      await api.delete(`/admin/shop/products/${productId}/images/${imageId}`);
    },

    async bulkCopyProducts(productIds: string[]) {
      this.loading = true;
      this.error = null;
      try {
        // Shop bulk routes all key on `product_ids` (matching bulk-delete /
        // bulk-activate / bulk-deactivate), never `ids`. Copies land inactive
        // with fresh slug + sku and duplicated variants/images server-side.
        const response = await api.post('/admin/shop/products/bulk-copy', {
          product_ids: productIds,
        }) as { products: ProductAdmin[]; count: number };
        return response;
      } catch (error) {
        this.error = (error as Error).message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Bulk category / tag assignment. All shop bulk routes key on `product_ids`
    // and answer with `{ updated, skipped }`; `category_id` accepts a uuid OR a
    // slug server-side. The view refreshes + clears selection on the returned
    // envelope, so these methods only own the request/response shape.
    async bulkAssignCategory(
      productIds: string[],
      categoryId: string,
      mode: BulkAssignMode = 'add',
    ): Promise<BulkResult> {
      return await api.post('/admin/shop/products/bulk/assign-category', {
        product_ids: productIds,
        category_id: categoryId,
        mode,
      }) as BulkResult;
    },

    async bulkUnassignCategory(productIds: string[], categoryId: string): Promise<BulkResult> {
      return await api.post('/admin/shop/products/bulk/unassign-category', {
        product_ids: productIds,
        category_id: categoryId,
      }) as BulkResult;
    },

    async bulkAssignTags(
      productIds: string[],
      tagSlugs: string[],
      mode: BulkAssignMode = 'add',
    ): Promise<BulkResult> {
      return await api.post('/admin/shop/products/bulk/assign-tags', {
        product_ids: productIds,
        tag_slugs: tagSlugs,
        mode,
      }) as BulkResult;
    },

    async deleteProduct(productId: string) {
      this.loading = true;
      this.error = null;
      try {
        await api.delete(`/admin/shop/products/${productId}`);
        this.products = this.products.filter(p => p.id !== productId);
      } catch (error) {
        this.error = (error as Error).message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
