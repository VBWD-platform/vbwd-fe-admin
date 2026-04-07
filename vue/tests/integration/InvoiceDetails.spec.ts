import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import InvoiceDetails from '@/views/InvoiceDetails.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';

// Mock the API module
vi.mock('@/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn()
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn()
}));

describe('InvoiceDetails.vue', () => {
  let router: ReturnType<typeof createRouter>;

  const mockInvoice = {
    id: '1',
    invoice_number: 'INV-001',
    user_id: 'user-1',
    user_email: 'user@test.com',
    user_name: 'Test User',
    subscription_id: 'sub-1',
    amount: 29.99,
    currency: 'USD',
    status: 'PAID',
    due_date: '2025-01-15T00:00:00Z',
    paid_at: '2025-01-10T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    line_items: [
      { id: 'item-1', description: 'Pro Plan - Monthly', quantity: 1, unit_price: 29.99, amount: 29.99 }
    ],
    billing_address: {
      line1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postal_code: '94102',
      country: 'US'
    }
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    configureAuthStore({
      storageKey: 'test_token',
      apiClient: { post: async () => ({}), get: async () => ({}), setToken: () => {}, clearToken: () => {} } as any,
    });
    const authStore = useAuthStore();
    authStore.$patch({
      user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
      token: 'test-token',
    });
    vi.clearAllMocks();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/invoices', name: 'invoices', component: { template: '<div>Invoices</div>' } },
        { path: '/admin/invoices/:id', name: 'invoice-details', component: InvoiceDetails }
      ]
    });

    // Default mock response
    vi.mocked(api.get).mockResolvedValue({ invoice: mockInvoice });
  });

  it('fetches invoice details on mount', async () => {
    await router.push('/admin/invoices/1');

    mount(InvoiceDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/invoices/1');
  });

  it('displays invoice information', async () => {
    await router.push('/admin/invoices/1');

    const wrapper = mount(InvoiceDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('INV-001');
    expect(wrapper.text()).toContain('user@test.com');
    expect(wrapper.text()).toContain('Test User');
    expect(wrapper.text()).toContain('$29.99');
  });

  it('displays invoice status badge', async () => {
    await router.push('/admin/invoices/1');

    const wrapper = mount(InvoiceDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="status-paid"]').exists()).toBe(true);
  });

  it('displays line items', async () => {
    await router.push('/admin/invoices/1');

    const wrapper = mount(InvoiceDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="line-items"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Pro Plan - Monthly');
  });

  it('displays billing address', async () => {
    await router.push('/admin/invoices/1');

    const wrapper = mount(InvoiceDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="billing-address"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('123 Main St');
    expect(wrapper.text()).toContain('San Francisco');
  });

  it('can resend invoice', async () => {
    vi.mocked(api.post).mockResolvedValue({ message: 'Invoice sent' });

    await router.push('/admin/invoices/1');

    const wrapper = mount(InvoiceDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const resendBtn = wrapper.find('[data-testid="resend-button"]');
    await resendBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/admin/invoices/1/resend', {});
  });

  it('can void open invoice', async () => {
    vi.mocked(api.get).mockResolvedValue({
      invoice: { ...mockInvoice, status: 'PENDING' }
    });
    vi.mocked(api.post).mockResolvedValue({ message: 'Invoice voided' });

    await router.push('/admin/invoices/1');

    const wrapper = mount(InvoiceDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const voidBtn = wrapper.find('[data-testid="void-button"]');
    await voidBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/admin/invoices/1/void', {});
  });

  it('hides void button for paid invoices', async () => {
    await router.push('/admin/invoices/1');

    const wrapper = mount(InvoiceDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="void-button"]').exists()).toBe(false);
  });

  it('navigates back to invoices list', async () => {
    await router.push('/admin/invoices/1');

    const wrapper = mount(InvoiceDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const backBtn = wrapper.find('[data-testid="back-button"]');
    await backBtn.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/invoices');
  });

  it('shows loading state while fetching', async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

    await router.push('/admin/invoices/1');

    const wrapper = mount(InvoiceDetails, {
      global: {
        plugins: [router]
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
  });

  it('shows error state on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValue(new Error('Invoice not found'));

    await router.push('/admin/invoices/1');

    const wrapper = mount(InvoiceDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Invoice not found');

    consoleSpy.mockRestore();
  });
});
