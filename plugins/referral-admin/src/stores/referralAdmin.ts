import { defineStore } from 'pinia';
import { api } from '@/api';

/** Program settings singleton (mirrors the backend ReferralSettings). */
export interface ReferralSettings {
  commission_type: 'percent_of_sale' | 'absolute_tokens';
  commission_value: string;
  selected_template_coupon_ids: string[];
}

/** A masked-or-full referral stat row (masking is authoritative server-side). */
export interface ReferralCouponStat {
  id: string;
  issuer_user_id: string;
  issuer_nickname: string;
  coupon_code: string;
  status: string;
  discount_value: string | null;
  discount_amount: string | null;
  commission_tokens_paid: number | null;
  issued_at: string | null;
  used_at: string | null;
}

/** A discount coupon offered as a referral template (from /admin/coupons). */
export interface TemplateCoupon {
  id: string;
  code: string;
}

interface CouponsQuery {
  status?: string;
  issuer?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

function buildQueryString(query: CouponsQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const useReferralAdminStore = defineStore('referralAdmin', {
  state: () => ({
    settings: null as ReferralSettings | null,
    coupons: [] as ReferralCouponStat[],
    total: 0,
    templateCoupons: [] as TemplateCoupon[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchSettings() {
      this.loading = true;
      this.error = null;
      try {
        const res = (await api.get('/admin/referral/settings')) as {
          settings: ReferralSettings;
        };
        this.settings = res.settings;
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
    },

    async saveSettings(settings: ReferralSettings) {
      this.error = null;
      const res = (await api.put('/admin/referral/settings', settings)) as {
        settings: ReferralSettings;
      };
      this.settings = res.settings;
      return res.settings;
    },

    async fetchTemplateCoupons() {
      const res = (await api.get('/admin/coupons')) as { coupons: TemplateCoupon[] };
      this.templateCoupons = res.coupons;
    },

    async fetchCoupons(query: CouponsQuery = {}) {
      this.loading = true;
      this.error = null;
      try {
        const res = (await api.get(
          `/admin/referral/coupons${buildQueryString(query)}`,
        )) as { coupons: ReferralCouponStat[]; total: number };
        this.coupons = res.coupons;
        this.total = res.total;
      } catch (error) {
        this.error = (error as Error).message;
        this.coupons = [];
        this.total = 0;
      } finally {
        this.loading = false;
      }
    },

    async bulkDeleteCoupons(ids: string[]) {
      await api.post('/admin/referral/coupons/bulk-delete', { ids });
    },
  },
});
