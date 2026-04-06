import { defineStore } from 'pinia';
import { api } from '@/api';

export interface Discount {
  id: string;
  name: string;
  slug: string;
  discount_type: string;
  value: string;
  currency: string | null;
  scope: string;
  conditions: Record<string, unknown>;
  min_order_amount: string | null;
  max_discount_amount: string | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  current_uses: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  stackable: boolean;
  priority: number;
  coupons: Coupon[];
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_id: string;
  max_uses: number | null;
  max_uses_per_user: number | null;
  current_uses: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CouponUsageRecord {
  id: string;
  coupon_id: string;
  user_id: string;
  invoice_id: string | null;
  discount_amount: string;
  used_at: string;
}

export const useDiscountAdminStore = defineStore('discountAdmin', {
  state: () => ({
    discounts: [] as Discount[],
    coupons: [] as Coupon[],
    selectedDiscount: null as Discount | null,
    selectedCoupon: null as Coupon | null,
    usages: [] as CouponUsageRecord[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchDiscounts() {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/admin/discounts') as { discounts: Discount[] };
        this.discounts = res.discounts;
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
    },

    async fetchDiscount(id: string) {
      this.loading = true;
      try {
        const res = await api.get(`/admin/discounts/${id}`) as { discount: Discount };
        this.selectedDiscount = res.discount;
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
    },

    async createDiscount(data: Partial<Discount>) {
      const res = await api.post('/admin/discounts', data) as { discount: Discount };
      return res.discount;
    },

    async updateDiscount(id: string, data: Partial<Discount>) {
      const res = await api.put(`/admin/discounts/${id}`, data) as { discount: Discount };
      this.selectedDiscount = res.discount;
      return res.discount;
    },

    async deleteDiscount(id: string) {
      await api.delete(`/admin/discounts/${id}`);
      this.discounts = this.discounts.filter(d => d.id !== id);
    },

    async fetchCoupons() {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/admin/coupons') as { coupons: Coupon[] };
        this.coupons = res.coupons;
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
    },

    async fetchCoupon(id: string) {
      const res = await api.get(`/admin/coupons/${id}`) as { coupon: Coupon };
      this.selectedCoupon = res.coupon;
      return res.coupon;
    },

    async createCoupon(data: Partial<Coupon>) {
      const res = await api.post('/admin/coupons', data) as { coupon: Coupon };
      return res.coupon;
    },

    async updateCoupon(id: string, data: Partial<Coupon>) {
      const res = await api.put(`/admin/coupons/${id}`, data) as { coupon: Coupon };
      return res.coupon;
    },

    async deleteCoupon(id: string) {
      await api.delete(`/admin/coupons/${id}`);
      this.coupons = this.coupons.filter(c => c.id !== id);
    },

    async fetchCouponUsage(couponId: string) {
      const res = await api.get(`/admin/coupons/${couponId}/usage`) as { usages: CouponUsageRecord[] };
      this.usages = res.usages;
    },

    async generateCoupons(discountId: string, count: number) {
      const res = await api.post('/admin/coupons/generate', {
        discount_id: discountId,
        count,
      }) as { coupons: Coupon[] };
      return res.coupons;
    },
  },
});
