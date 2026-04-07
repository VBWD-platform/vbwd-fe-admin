import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Invoices from '@/views/Invoices.vue';
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

describe('Invoices.vue', () => {
  let router: ReturnType<typeof createRouter>;

  const mockInvoices = [
    { id: '1', invoice_number: 'INV-001', user_email: 'user1@test.com', amount: 29.99, currency: 'USD', status: 'paid', created_at: '2025-01-01' },
    { id: '2', invoice_number: 'INV-002', user_email: 'user2@test.com', amount: 99.99, currency: 'USD', status: 'open', created_at: '2025-01-02' },
    { id: '3', invoice_number: 'INV-003', user_email: 'user3@test.com', amount: 49.99, currency: 'USD', status: 'void', created_at: '2025-01-03' }
  ];

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
        { path: '/', redirect: '/admin/invoices' },
        { path: '/admin/invoices', name: 'invoices', component: Invoices },
        { path: '/admin/invoices/:id', name: 'invoice-details', component: { template: '<div>Details</div>' } }
      ]
    });

    // Default mock response
    vi.mocked(api.get).mockResolvedValue({
      invoices: mockInvoices,
      total: 3,
      page: 1,
      per_page: 20
    });
  });

  it('renders invoices table with data', async () => {
    const wrapper = mount(Invoices, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="invoices-table"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Invoice #');
    expect(wrapper.text()).toContain('User');
    expect(wrapper.text()).toContain('Amount');
    expect(wrapper.text()).toContain('Status');
  });

  it('displays invoice data in table rows', async () => {
    const wrapper = mount(Invoices, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('INV-001');
    expect(wrapper.text()).toContain('user1@test.com');
    expect(wrapper.text()).toContain('$29.99');
    expect(wrapper.text()).toContain('INV-002');
    expect(wrapper.text()).toContain('$99.99');
  });

  it('shows loading state while fetching invoices', async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

    const wrapper = mount(Invoices, {
      global: {
        plugins: [router]
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
  });

  it('displays status badges with appropriate styling', async () => {
    const wrapper = mount(Invoices, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="status-paid"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="status-open"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="status-void"]').exists()).toBe(true);
  });

  it('filters invoices by status', async () => {
    const wrapper = mount(Invoices, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();
    vi.clearAllMocks();

    vi.mocked(api.get).mockResolvedValue({
      invoices: mockInvoices.filter(i => i.status === 'paid'),
      total: 1,
      page: 1,
      per_page: 20
    });

    const statusFilter = wrapper.find('[data-testid="status-filter"]');
    await statusFilter.setValue('PAID');
    await statusFilter.trigger('change');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/invoices', expect.objectContaining({
      params: expect.objectContaining({ status: 'PAID' })
    }));
  });

  it('navigates to invoice details on row click', async () => {
    await router.push('/admin/invoices');

    const wrapper = mount(Invoices, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const firstRow = wrapper.find('[data-testid="invoice-row-1"]');
    await firstRow.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/invoices/1');
  });

  it('handles pagination', async () => {
    vi.mocked(api.get).mockResolvedValue({
      invoices: mockInvoices,
      total: 100,
      page: 1,
      per_page: 20
    });

    const wrapper = mount(Invoices, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(true);

    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({
      invoices: mockInvoices,
      total: 100,
      page: 2,
      per_page: 20
    });

    const nextBtn = wrapper.find('[data-testid="pagination-next"]');
    await nextBtn.trigger('click');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/invoices', expect.objectContaining({
      params: expect.objectContaining({ page: 2 })
    }));
  });

  it('displays error message on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValue(new Error('Failed to fetch invoices'));

    const wrapper = mount(Invoices, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Failed to fetch invoices');

    consoleSpy.mockRestore();
  });

  it('shows empty state when no invoices found', async () => {
    vi.mocked(api.get).mockResolvedValue({
      invoices: [],
      total: 0,
      page: 1,
      per_page: 20
    });

    const wrapper = mount(Invoices, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('No invoices found');
  });

  it('displays total invoices count', async () => {
    vi.mocked(api.get).mockResolvedValue({
      invoices: mockInvoices,
      total: 150,
      page: 1,
      per_page: 20
    });

    const wrapper = mount(Invoices, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('150');
  });
});
