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
  is_digital: boolean;
  has_variants: boolean;
  weight: string | null;
  tax_class: string;
  primary_image_url: string | null;
  images: Array<{ id: string; url: string; alt: string; is_primary: boolean }>;
  variants: Array<{ id: string; name: string; sku: string | null; price: string | null; attributes: Record<string, string> }>;
  categories: Array<{ id: string; name: string; slug: string }>;
  created_at: string;
}

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
