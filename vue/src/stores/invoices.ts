import { defineStore } from 'pinia';
import { api } from '../api';

export interface Invoice {
  id: string;
  invoice_number: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  amount: number;
  // Persisted invoice-level tax breakdown (S85). The backend payload carries
  // these alongside ``amount``; they drive the tax-disclosure block.
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  currency?: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  due_date?: string;
  paid_at?: string;
  created_at?: string;
}

// Core invoices are subscription-agnostic. Any plan/subscription metadata is
// contributed by a plugin (backend `enrich_invoice`) and rendered via the
// `invoiceDetailSections` extension point — core does not type or display it.
export interface InvoiceDetail extends Invoice {
  line_items?: LineItem[];
  billing_address?: BillingAddress;
  payment_method?: string;
  // Free-form JSON written by payment plugins under their namespace
  // (e.g. ``{ tokens_paid: { amount: 600 } }``). Rendered via the shared
  // fe-core ``PaymentDataBlock`` driven by the ``paymentDataContributors``
  // registry — core is agnostic about any namespace's shape.
  metadata?: Record<string, unknown> | null;
}

export interface LineItemTax {
  code: string;
  name?: string;
  rate: number;
  amount: number;
}

export interface LineItem {
  id?: string;
  type?: string;
  item_id?: string;
  description: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
  // S85.4: persisted per-line tax disclosure (net / tax / per-rate breakdown).
  net_amount?: string;
  tax_amount?: string;
  tax_breakdown?: LineItemTax[];
  // S77: frozen snapshot of the source item's tags + custom-fields, copied
  // onto the line at issue time (read-only — never live-joined to the source).
  tags?: string[];
  custom_fields?: Record<string, unknown>;
}

export interface BillingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface FetchInvoicesParams {
  page: number;
  per_page: number;
  status?: string;
  user_id?: string;
}

export interface FetchInvoicesResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  per_page: number;
}

export const useInvoicesStore = defineStore('invoices', {
  state: () => ({
    invoices: [] as Invoice[],
    selectedInvoice: null as InvoiceDetail | null,
    total: 0,
    page: 1,
    perPage: 20,
    loading: false,
    error: null as string | null
  }),

  getters: {
    hasInvoices: (state): boolean => state.invoices.length > 0,
    totalPages: (state): number => Math.ceil(state.total / state.perPage)
  },

  actions: {
    async fetchInvoices(params: FetchInvoicesParams): Promise<FetchInvoicesResponse> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get('/admin/invoices', {
          params: {
            page: params.page,
            per_page: params.per_page,
            status: params.status || '',
            user_id: params.user_id || ''
          }
        }) as FetchInvoicesResponse;

        this.invoices = response.invoices;
        this.total = response.total;
        this.page = response.page;
        this.perPage = response.per_page;
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch invoices';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchInvoice(invoiceId: string): Promise<InvoiceDetail> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get(`/admin/invoices/${invoiceId}`) as { invoice: InvoiceDetail };
        this.selectedInvoice = response.invoice;
        return response.invoice;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch invoice';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async refundInvoice(invoiceId: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.post(`/admin/invoices/${invoiceId}/refund`, {});

        // Update local state
        if (this.selectedInvoice?.id === invoiceId) {
          this.selectedInvoice.status = 'REFUNDED';
        }
        const index = this.invoices.findIndex(i => i.id === invoiceId);
        if (index !== -1) {
          this.invoices[index].status = 'REFUNDED';
        }
      } catch (error) {
        this.error = (error as Error).message || 'Failed to process refund';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async markPaid(invoiceId: string, paymentReference?: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.post(`/admin/invoices/${invoiceId}/mark-paid`, {
          payment_reference: paymentReference || 'MANUAL'
        });

        // Update local state
        if (this.selectedInvoice?.id === invoiceId) {
          this.selectedInvoice.status = 'PAID';
        }
        const index = this.invoices.findIndex(i => i.id === invoiceId);
        if (index !== -1) {
          this.invoices[index].status = 'PAID';
        }
      } catch (error) {
        this.error = (error as Error).message || 'Failed to mark invoice as paid';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async markInvoicePaid(invoiceId: string): Promise<void> {
      // Alias for bulk operations
      return this.markPaid(invoiceId, 'MANUAL');
    },

    async resendInvoice(invoiceId: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.post(`/admin/invoices/${invoiceId}/resend`, {});
      } catch (error) {
        this.error = (error as Error).message || 'Failed to resend invoice';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async voidInvoice(invoiceId: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.post(`/admin/invoices/${invoiceId}/void`, {});

        // Update local state
        if (this.selectedInvoice?.id === invoiceId) {
          this.selectedInvoice.status = 'CANCELLED';
        }
        const index = this.invoices.findIndex(i => i.id === invoiceId);
        if (index !== -1) {
          this.invoices[index].status = 'CANCELLED';
        }
      } catch (error) {
        this.error = (error as Error).message || 'Failed to void invoice';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async duplicateInvoice(invoiceId: string): Promise<Invoice> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post(`/admin/invoices/${invoiceId}/duplicate`, {}) as { invoice: Invoice };
        const newInvoice = response.invoice;

        // Add to local list
        this.invoices.unshift(newInvoice);
        this.total += 1;

        return newInvoice;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to duplicate invoice';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteInvoice(invoiceId: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.delete(`/admin/invoices/${invoiceId}`);

        // Update local state
        const index = this.invoices.findIndex(i => i.id === invoiceId);
        if (index !== -1) {
          this.invoices.splice(index, 1);
          this.total -= 1;
        }

        if (this.selectedInvoice?.id === invoiceId) {
          this.selectedInvoice = null;
        }
      } catch (error) {
        // Extract error message from API response if available
        let errorMessage = 'Failed to delete invoice';
        if (error instanceof Error) {
          // Try to extract error from API response
          const apiError = (error as any).response?.data?.error;
          if (apiError) {
            errorMessage = apiError;
          } else {
            errorMessage = error.message;
          }
        }
        this.error = errorMessage;
        throw new Error(errorMessage);
      } finally {
        this.loading = false;
      }
    },

    clearSelectedInvoice(): void {
      this.selectedInvoice = null;
    },

    reset(): void {
      this.invoices = [];
      this.selectedInvoice = null;
      this.total = 0;
      this.page = 1;
      this.error = null;
      this.loading = false;
    }
  }
});
