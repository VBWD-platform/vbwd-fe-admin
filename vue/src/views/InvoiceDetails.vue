<template>
  <div
    class="invoice-details-view"
    data-testid="invoice-details-view"
  >
    <div
      v-if="loading"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('invoices.loadingInvoice') }}</p>
    </div>

    <div
      v-else-if="error"
      data-testid="error-message"
      class="error-state"
    >
      <p>{{ error }}</p>
      <button
        class="back-btn"
        @click="goBack"
      >
        {{ $t('invoices.backToInvoices') }}
      </button>
    </div>

    <template v-else-if="invoice">
      <div class="details-header">
        <button
          data-testid="back-button"
          class="back-btn"
          @click="goBack"
        >
          ← {{ $t('invoices.backToInvoices') }}
        </button>
        <h2>{{ $t('invoices.invoice') }} {{ invoice.invoice_number }}</h2>
      </div>

      <div class="details-content">
        <div class="info-section">
          <h3>{{ $t('invoices.customerInfo') }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('users.email') }}</label>
              <span>{{ invoice.user_email }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('users.name') }}</label>
              <span>{{ invoice.user_name }}</span>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>{{ $t('invoices.invoiceInfo') }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('invoices.invoiceNumber') }}</label>
              <span>{{ invoice.invoice_number }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('common.status') }}</label>
              <span
                :data-testid="`status-${invoice.status.toLowerCase()}`"
                class="status-badge"
                :class="invoice.status.toLowerCase()"
              >
                {{ formatStatus(invoice.status) }}
              </span>
            </div>
            <div class="info-item">
              <label>{{ $t('invoices.amount') }}</label>
              <span class="amount">{{ formatAmount(invoice.amount, invoice.currency) }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('invoices.dueDate') }}</label>
              <span>{{ formatDate(invoice.due_date) }}</span>
            </div>
            <div
              v-if="invoice.paid_at"
              class="info-item"
            >
              <label>{{ $t('invoices.paidAt') }}</label>
              <span>{{ formatDate(invoice.paid_at) }}</span>
            </div>
            <div
              v-if="invoice.payment_method"
              class="info-item"
            >
              <label>{{ $t('invoices.paymentMethod') }}</label>
              <span data-testid="payment-method">{{ invoice.payment_method }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('common.created') }}</label>
              <span>{{ formatDate(invoice.created_at) }}</span>
            </div>
          </div>

          <!-- Plugin-contributed payment-method rows (token-payment, stripe,
               paypal, …) — visual peers of the rows above, no heading or
               chrome of their own. Block + registry live in vbwd-fe-core.
               ``payment-method`` enables the legacy/zero-price fallback. -->
          <PaymentDataBlock
            :metadata="invoice.metadata"
            :payment-method="invoice.payment_method"
          />
        </div>

        <!-- Payment Information — peer section of "Invoice Information".
             Each payment plugin contributes its own multi-row table
             (Tokens: Payment type / Tokens paid;
              Stripe: Payment type / Transaction id / Authorised / Captured /
              Refunded). Block + registry live in vbwd-fe-core. -->
        <PaymentInformationBlock
          :metadata="invoice.metadata"
          :payment-method="invoice.payment_method"
          :heading="$t('invoices.paymentInformation')"
        />

        <div
          class="info-section"
          data-testid="line-items"
        >
          <h3>{{ $t('invoices.lineItems') }}</h3>
          <table
            v-if="invoice.line_items?.length"
            class="line-items-table"
          >
            <thead>
              <tr>
                <th>{{ $t('common.type') || 'Type' }}</th>
                <th>{{ $t('common.description') }}</th>
                <th>{{ $t('invoices.qty') }}</th>
                <th>{{ $t('invoices.unitPrice') }}</th>
                <th>{{ $t('invoices.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in invoice.line_items"
                :key="item.id || item.description"
                :style="itemLink(item) ? 'cursor: pointer' : ''"
                @click="itemLink(item) && router.push(itemLink(item)!)"
              >
                <td>
                  <span
                    class="type-badge"
                    :class="item.type?.toLowerCase()"
                  >{{ itemTypeLabel(item.type) }}</span>
                </td>
                <td>
                  <router-link
                    v-if="itemLink(item)"
                    :to="itemLink(item)!"
                    class="item-description-link"
                    @click.stop
                  >
                    {{ item.description }}
                  </router-link>
                  <span v-else>{{ item.description }}</span>
                  <!-- S77: frozen tags + custom-fields snapshot (read-only). -->
                  <TagChips
                    v-if="item.tags?.length"
                    :tags="item.tags"
                    class="line-item-tags"
                  />
                  <CustomFieldsDisplay
                    v-if="item.custom_fields && Object.keys(item.custom_fields).length"
                    :custom-fields="item.custom_fields"
                    class="line-item-custom-fields"
                  />
                </td>
                <td>{{ item.quantity || 1 }}</td>
                <td>{{ formatAmount(item.unit_price || item.amount, invoice.currency) }}</td>
                <td>{{ formatAmount(item.amount, invoice.currency) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td
                  colspan="4"
                  class="total-label"
                >
                  {{ $t('invoices.total') }}
                </td>
                <td class="total-amount">
                  {{ formatAmount(invoice.amount, invoice.currency) }}
                </td>
              </tr>
            </tfoot>
          </table>
          <p
            v-else
            class="no-items"
          >
            {{ $t('invoices.noLineItems') }}
          </p>

          <!-- Tax-disclosure block (S85.4): per-rate tax lines aggregated from
               the persisted line-item tax_breakdown plus net / Σtax / gross
               totals. Falls back to a single aggregate line for legacy invoices
               with no per-line breakdown. No tax math here — the FE echoes the
               payload through the shared <PriceBreakdown>. -->
          <PriceBreakdown
            class="invoice-tax-breakdown"
            data-testid="invoice-tax-breakdown"
            :price="priceBreakdown"
          />
        </div>

        <!-- Plugin-contributed sections (e.g. subscription info) — core stays
             agnostic and renders whatever plugins inject for an invoice. -->
        <component
          :is="Section"
          v-for="(Section, index) in pluginSections"
          :key="index"
          :invoice="invoice"
        />

        <div
          v-if="invoice.billing_address"
          class="info-section"
          data-testid="billing-address"
        >
          <h3>{{ $t('invoices.billingAddress') }}</h3>
          <div class="address">
            <p v-if="invoice.billing_address.line1">
              {{ invoice.billing_address.line1 }}
            </p>
            <p v-if="invoice.billing_address.line2">
              {{ invoice.billing_address.line2 }}
            </p>
            <p>
              {{ invoice.billing_address.city }}<span v-if="invoice.billing_address.state">, {{ invoice.billing_address.state }}</span>
              {{ invoice.billing_address.postal_code }}
            </p>
            <p v-if="invoice.billing_address.country">
              {{ invoice.billing_address.country }}
            </p>
          </div>
        </div>

        <div class="actions-section">
          <button
            v-if="canManage"
            data-testid="duplicate-button"
            class="action-btn duplicate-btn"
            :disabled="processing"
            @click="handleDuplicate"
          >
            {{ processing ? $t('invoices.duplicating') : $t('invoices.duplicate') }}
          </button>
          <button
            v-if="canManage"
            data-testid="resend-button"
            class="action-btn resend-btn"
            :disabled="processing"
            @click="handleResend"
          >
            {{ processing ? $t('invoices.sending') : $t('invoices.resend') }}
          </button>
          <button
            v-if="canManage && invoice.status === 'PENDING'"
            data-testid="mark-paid-button"
            class="action-btn mark-paid-btn"
            :disabled="processing"
            @click="handleMarkPaid"
          >
            {{ processing ? $t('common.processing') : $t('invoices.markAsPaid') }}
          </button>
          <button
            v-if="canManage && invoice.status === 'PENDING'"
            data-testid="void-button"
            class="action-btn void-btn"
            :disabled="processing"
            @click="handleVoid"
          >
            {{ processing ? $t('common.processing') : $t('invoices.void') }}
          </button>
          <button
            v-if="canManage && invoice.status === 'PAID'"
            data-testid="refund-button"
            class="action-btn refund-btn"
            :disabled="processing"
            @click="handleRefund"
          >
            {{ processing ? $t('common.processing') : $t('invoices.refund') }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  PaymentDataBlock,
  PaymentInformationBlock,
  TagChips,
  CustomFieldsDisplay,
} from 'vbwd-view-component';
import { useInvoicesStore } from '@/stores/invoices';
import type { LineItem, LineItemTax } from '@/stores/invoices';
import { useAuthStore } from '@/stores/auth';
import { extensionRegistry } from '@/plugins/extensionRegistry';
import PriceBreakdown from '@/components/PriceBreakdown.vue';
import type { PriceVO } from '@/utils/priceDisplay';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const invoicesStore = useInvoicesStore();
const authStore = useAuthStore();
const canManage = computed(() => authStore.hasPermission('invoices.manage'));

// Plugin-contributed invoice sections (subscription info lives here now).
const pluginSections = computed(() => extensionRegistry.getInvoiceDetailSections());

const processing = ref(false);

const invoice = computed(() => invoicesStore.selectedInvoice);
const loading = computed(() => invoicesStore.loading);
const error = computed(() => invoicesStore.error);

// Persisted Price VO for the tax-disclosure block (S85.4). Built straight from
// the stored fields — never recomputed. Per-rate tax lines are AGGREGATED from
// the persisted line-item tax_breakdown (sum of already-computed amounts per
// code+rate — a display sum, never a tax recompute). When no line carries a
// breakdown (legacy invoices), it falls back to a single aggregate tax line
// from the invoice-level ``tax_amount``; taxless invoices show net == gross.
const priceBreakdown = computed<PriceVO>(() => {
  const current = invoice.value;
  const fallback = Number(current?.amount ?? 0);
  const netto = Number(current?.subtotal ?? fallback);
  const aggregateTax = Number(current?.tax_amount ?? 0);
  const gross = Number(current?.total_amount ?? fallback);

  const perRate = aggregateTaxBreakdown(current?.line_items);
  const taxes = perRate.length > 0
    ? perRate
    : aggregateTax > 0
      ? [{ code: 'TAX', rate: 0, amount: aggregateTax }]
      : [];

  return {
    netto,
    taxes,
    brutto: gross,
    currency: current?.currency || 'USD',
  };
});

// Sum the persisted per-rate amounts across all line items, grouped by
// code+rate, into one tax line per rate. Purely a display aggregation of values
// the backend already computed — the FE performs no tax arithmetic.
function aggregateTaxBreakdown(lineItems?: LineItem[]): LineItemTax[] {
  if (!lineItems?.length) return [];
  const byRate = new Map<string, LineItemTax>();
  for (const item of lineItems) {
    for (const tax of item.tax_breakdown ?? []) {
      const key = `${tax.code}-${tax.rate}`;
      const existing = byRate.get(key);
      if (existing) {
        existing.amount += tax.amount;
      } else {
        byRate.set(key, { code: tax.code, name: tax.name, rate: tax.rate, amount: tax.amount });
      }
    }
  }
  return Array.from(byRate.values());
}

async function fetchInvoice(): Promise<void> {
  const invoiceId = route.params.id as string;
  try {
    await invoicesStore.fetchInvoice(invoiceId);
  } catch {
    // Error is already set in the store
  }
}

async function handleResend(): Promise<void> {
  if (!invoice.value) return;

  processing.value = true;
  try {
    await invoicesStore.resendInvoice(invoice.value.id);
  } catch {
    // Error is already set in the store
  } finally {
    processing.value = false;
  }
}

async function handleVoid(): Promise<void> {
  if (!invoice.value) return;

  processing.value = true;
  try {
    await invoicesStore.voidInvoice(invoice.value.id);
    await fetchInvoice();
  } catch {
    // Error is already set in the store
  } finally {
    processing.value = false;
  }
}

async function handleMarkPaid(): Promise<void> {
  if (!invoice.value) return;

  processing.value = true;
  try {
    await invoicesStore.markPaid(invoice.value.id);
    await fetchInvoice();
  } catch {
    // Error is already set in the store
  } finally {
    processing.value = false;
  }
}

async function handleRefund(): Promise<void> {
  if (!invoice.value) return;

  processing.value = true;
  try {
    await invoicesStore.refundInvoice(invoice.value.id);
    await fetchInvoice();
  } catch {
    // Error is already set in the store
  } finally {
    processing.value = false;
  }
}

async function handleDuplicate(): Promise<void> {
  if (!invoice.value) return;

  processing.value = true;
  try {
    const newInvoice = await invoicesStore.duplicateInvoice(invoice.value.id);
    // Navigate to the new invoice
    router.push(`/admin/invoices/${newInvoice.id}`);
  } catch {
    // Error is already set in the store
  } finally {
    processing.value = false;
  }
}

function goBack(): void {
  router.push('/admin/invoices');
}

function formatStatus(status: string): string {
  const statusKey = `invoices.statuses.${status}`;
  const translated = t(statusKey);
  return translated !== statusKey ? translated : status;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
}

function formatAmount(amount?: number, currency?: string): string {
  if (amount === undefined) return '-';
  const currencyCode = currency || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(amount);
}

function itemTypeLabel(type?: string): string {
  const labels: Record<string, string> = {
    subscription: 'Plan',
    token_bundle: 'Token Bundle',
    add_on: 'Add-On',
  };
  return labels[type || ''] || type || 'Item';
}

function itemLink(item: { type?: string; item_id?: string; catalog_item_id?: string; metadata?: Record<string, unknown> }): string | null {
  switch (item.type?.toUpperCase()) {
    case 'SUBSCRIPTION':
      return item.catalog_item_id ? `/admin/plans/${item.catalog_item_id}/edit` : null;
    case 'TOKEN_BUNDLE':
      return item.catalog_item_id ? `/admin/settings/token-bundles/${item.catalog_item_id}` : null;
    case 'ADD_ON':
      return item.catalog_item_id ? `/admin/add-ons/${item.catalog_item_id}/edit` : null;
    default:
      break;
  }
  // Plugin-based line items (e.g., booking → resource schedule)
  if (item.type?.toLowerCase() === 'booking' && item.metadata) {
    const resourceId = item.metadata.resource_id as string;
    if (resourceId) {
      return `/admin/booking/resources/${resourceId}/schedule`;
    }
    const bookingId = item.metadata.booking_id as string;
    if (bookingId) return `/admin/booking/${bookingId}`;
  }
  return null;
}

onMounted(() => {
  fetchInvoice();
});
</script>

<style scoped>
.invoice-details-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.details-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.details-header h2 {
  margin: 0;
  color: #2c3e50;
}

.back-btn {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.back-btn:hover {
  background: #5a6268;
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.info-section {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
}

.info-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item label {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

.info-item span {
  font-size: 1rem;
  color: #2c3e50;
}

.amount {
  font-weight: 600;
  font-size: 1.1rem;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  width: fit-content;
}

.status-badge.paid {
  background: #d4edda;
  color: #155724;
}

.status-badge.pending {
  background: #cce5ff;
  color: #004085;
}

.status-badge.failed {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.cancelled {
  background: #e9ecef;
  color: #495057;
}

.status-badge.refunded {
  background: #fff3cd;
  color: #856404;
}

.line-items-table {
  width: 100%;
  border-collapse: collapse;
}

.line-items-table th,
.line-items-table td {
  padding: 10px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.line-items-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.line-items-table tfoot td {
  font-weight: 600;
  border-top: 2px solid #eee;
}

.item-description-link {
  color: var(--admin-link, #3498db);
  text-decoration: none;
}
.item-description-link:hover {
  text-decoration: underline;
}

.total-label {
  text-align: right;
}

.total-amount {
  color: #2c3e50;
}

.no-items {
  color: #666;
  font-style: italic;
}

.type-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 500;
}

.type-badge.subscription {
  background: #e8f5e9;
  color: #2e7d32;
}

.type-badge.token_bundle {
  background: #e3f2fd;
  color: #1565c0;
}

.type-badge.add_on {
  background: #fce4ec;
  color: #c62828;
}

.type-badge.booking {
  background: #fff3e0;
  color: #e65100;
}

.type-badge.shop {
  background: #ede7f6;
  color: #4527a0;
}

.address p {
  margin: 5px 0;
  color: #2c3e50;
}

.actions-section {
  display: flex;
  gap: 15px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.resend-btn {
  background: #3498db;
  color: white;
}

.resend-btn:hover:not(:disabled) {
  background: #2980b9;
}

.void-btn {
  background: #dc3545;
  color: white;
}

.void-btn:hover:not(:disabled) {
  background: #c82333;
}

.mark-paid-btn {
  background: #28a745;
  color: white;
}

.mark-paid-btn:hover:not(:disabled) {
  background: #218838;
}

.refund-btn {
  background: #ffc107;
  color: #212529;
}

.refund-btn:hover:not(:disabled) {
  background: #e0a800;
}

.duplicate-btn {
  background: #6c757d;
  color: white;
}

.duplicate-btn:hover:not(:disabled) {
  background: #5a6268;
}
</style>
