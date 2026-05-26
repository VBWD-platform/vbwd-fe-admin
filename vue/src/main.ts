import { createVbwdAdminApp } from './factory';
import type { AdminExtensionMap } from './factory';
import { getEnabledPlugins, getAdminExtensions } from '@/utils/pluginLoader';
import type { IPlugin } from 'vbwd-view-component';
import {
  registerPaymentDataContributor,
  registerPaymentInformationContributor,
  formatMoney,
} from 'vbwd-view-component';

// Plugin-owned formatter for ``tokens_paid`` payloads. Lives here for now;
// will move into ``vbwd-fe-admin-plugin-token-payment`` once the loader's
// import.meta.glob is wired to discover that standalone repo.
function formatTokensPaidAmountAdmin(data: unknown): string {
  const amount = (data as { amount?: number } | null)?.amount ?? 0;
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(amount);
  return `${formatted} tokens`;
}

registerPaymentDataContributor('tokens_paid', {
  label: 'Paid with tokens',
  format: formatTokensPaidAmountAdmin,
  matchPaymentMethod: ['token_balance', 'token_payment'],
  order: 10,
});

// fe-admin Payment Information block — Tokens contribution.
registerPaymentInformationContributor('tokens_paid', {
  order: 10,
  matchPaymentMethod: ['token_balance', 'token_payment'],
  rows: (data) => [
    { label: 'Payment type', value: 'Tokens', order: 1 },
    { label: 'Tokens paid', value: formatTokensPaidAmountAdmin(data), order: 2 },
  ],
});

// PaymentDataBlock contributors — the ``tokens_paid`` namespace is now
// owned by the ``token-payment-admin`` plugin (see plugins/token-payment-admin),
// but ``stripe`` and ``paypal`` don't yet have standalone fe-admin plugins,
// so we register their renderers inline here. TODO(2026): extract into
// ``vbwd-fe-admin-plugin-stripe`` / ``…-paypal`` to match the convention.
// Compact preview of a Stripe ``pi_*`` so the row doesn't overflow the
// invoice-info column. Keep the first 14 characters + ellipsis when longer
// than 16; otherwise leave untouched.
function truncateStripeTransactionId(transactionId: string): string {
  return transactionId.length > 16 ? `${transactionId.slice(0, 14)}…` : transactionId;
}

function stripeDashboardLink(paymentIntentId: string): string | null {
  // Same Stripe dashboard URL works for both test + live (Stripe routes
  // based on the operator's logged-in dashboard session).
  return paymentIntentId ? `https://dashboard.stripe.com/payments/${paymentIntentId}` : null;
}

registerPaymentDataContributor('stripe', {
  label: 'Stripe transaction',
  format: (data) => {
    const paymentIntentId =
      ((data ?? {}) as { payment_intent_id?: string }).payment_intent_id || '';
    return paymentIntentId ? truncateStripeTransactionId(paymentIntentId) : '—';
  },
  link: (data) =>
    stripeDashboardLink(
      ((data ?? {}) as { payment_intent_id?: string }).payment_intent_id || '',
    ),
  order: 20,
});

// fe-admin Payment Information block — Stripe contribution: payment type +
// authorised / captured / refunded amounts. Missing amount fields render
// as "—" so the row order is stable across invoices.
registerPaymentInformationContributor('stripe', {
  order: 20,
  matchPaymentMethod: ['stripe'],
  rows: (data) => {
    const stripeData = (data ?? {}) as {
      payment_intent_id?: string;
      authorised_amount?: string | number;
      captured_amount?: string | number;
      refunded_amount?: string | number;
      currency?: string;
    };
    const currency = (stripeData.currency || 'USD').toUpperCase();
    const moneyOrDash = (raw: string | number | undefined): string => {
      if (raw === undefined || raw === null || raw === '') return '—';
      const value = typeof raw === 'string' ? Number(raw) : raw;
      return Number.isFinite(value) ? formatMoney(value, { currency }) : '—';
    };
    const paymentIntentId = stripeData.payment_intent_id || '';
    return [
      { label: 'Payment type', value: 'Stripe', order: 1 },
      {
        label: 'Transaction id',
        value: paymentIntentId ? truncateStripeTransactionId(paymentIntentId) : '—',
        link: stripeDashboardLink(paymentIntentId),
        order: 2,
      },
      { label: 'Authorised amount', value: moneyOrDash(stripeData.authorised_amount), order: 3 },
      { label: 'Captured amount', value: moneyOrDash(stripeData.captured_amount), order: 4 },
      { label: 'Refunded amount', value: moneyOrDash(stripeData.refunded_amount), order: 5 },
    ];
  },
});
registerPaymentDataContributor('paypal', {
  label: 'PayPal transaction',
  format: (data) => {
    const paypalData = (data ?? {}) as {
      capture_id?: string;
      order_id?: string;
      sale_id?: string;
      subscription_id?: string;
    };
    return (
      paypalData.capture_id ||
      paypalData.sale_id ||
      paypalData.order_id ||
      paypalData.subscription_id ||
      '—'
    );
  },
  order: 20,
});

(async () => {
  // Load plugins from local plugins/ directory (Vite glob)
  let plugins: IPlugin[] = [];
  try {
    plugins = await getEnabledPlugins();
    console.log(`[Admin] Using ${plugins.length} enabled plugin(s)`);
  } catch (error) {
    console.error('[Admin] Failed to load plugins, continuing without plugins:', error);
  }

  // Load admin extensions from plugins
  let adminExtensions: AdminExtensionMap = {};
  try {
    adminExtensions = await getAdminExtensions();
  } catch (error) {
    console.error('[Admin] Failed to load admin extensions:', error);
  }

  const { mount } = await createVbwdAdminApp({ plugins, adminExtensions });
  mount('#app');
})();
