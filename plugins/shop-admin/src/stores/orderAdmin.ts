import { defineStore } from 'pinia';
import { api } from '@/api';

export interface OrderAdmin {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  shipping_address: Record<string, string>;
  shipping_method: string | null;
  shipping_cost: string;
  tracking_number: string | null;
  tracking_url: string | null;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: string;
    total_price: string;
    is_refunded: boolean;
    product_snapshot: Record<string, unknown>;
  }>;
  created_at: string;
}

export const useOrderAdminStore = defineStore('shopOrderAdmin', {
  state: () => ({
    orders: [] as OrderAdmin[],
    selectedOrder: null as OrderAdmin | null,
    loading: false,
    error: null as string | null,
    page: 1,
    perPage: 25,
  }),

  actions: {
    async fetchOrders(page = 1, perPage = 25, status = '') {
      this.loading = true;
      this.error = null;
      try {
        const params: Record<string, string | number> = { page, per_page: perPage };
        if (status) params.status = status;
        const response = await api.get('/admin/shop/orders', { params }) as { orders: OrderAdmin[] };
        this.orders = response.orders;
        this.page = page;
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
    },

    async fetchOrder(orderId: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get(`/admin/shop/orders/${orderId}`) as { order: OrderAdmin };
        this.selectedOrder = response.order;
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
    },

    async shipOrder(orderId: string, trackingNumber: string, trackingUrl: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post(`/admin/shop/orders/${orderId}/ship`, {
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
        }) as { order: OrderAdmin };
        this.selectedOrder = response.order;
        return response.order;
      } catch (error) {
        this.error = (error as Error).message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async completeOrder(orderId: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post(`/admin/shop/orders/${orderId}/complete`) as { order: OrderAdmin };
        this.selectedOrder = response.order;
        return response.order;
      } catch (error) {
        this.error = (error as Error).message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
