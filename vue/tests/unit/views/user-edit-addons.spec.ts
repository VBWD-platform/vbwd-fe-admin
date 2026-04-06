import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import UserEdit from '@/views/UserEdit.vue';
import { api } from '@/api';

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

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

const mockUser = {
  id: '1',
  email: 'user@test.com',
  name: 'Test User',
  is_active: true,
  roles: ['user'],
  role: 'user',
  details: { balance: 0 }
};

const mockAddonSubs = [
  {
    id: 'addon-sub-1',
    addon_name: 'Extra Storage',
    status: 'active',
    invoice_status: 'paid',
    first_invoice: { id: 'inv-1', invoice_number: 'INV-001', created_at: '2026-01-01T00:00:00' },
    last_invoice: { id: 'inv-1', invoice_number: 'INV-001', created_at: '2026-01-01T00:00:00' },
    starts_at: '2026-01-01T00:00:00',
    expires_at: '2027-01-01T00:00:00',
    created_at: '2026-01-01T00:00:00',
  },
  {
    id: 'addon-sub-2',
    addon_name: 'Priority Support',
    status: 'cancelled',
    invoice_status: 'paid',
    first_invoice: { id: 'inv-2', invoice_number: 'INV-002', created_at: '2026-02-01T00:00:00' },
    last_invoice: { id: 'inv-2', invoice_number: 'INV-002', created_at: '2026-02-01T00:00:00' },
    starts_at: '2026-02-01T00:00:00',
    expires_at: null,
    created_at: '2026-02-01T00:00:00',
  }
];

function setupApiMocks(overrides: Record<string, unknown> = {}) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/users/1') {
      return Promise.resolve(overrides.user || { user: mockUser });
    }
    if (url === '/admin/users/1/addons') {
      return Promise.resolve(overrides.addons || { addon_subscriptions: mockAddonSubs });
    }
    if (url.includes('/admin/subscriptions')) {
      return Promise.resolve({ subscriptions: [], total: 0 });
    }
    if (url.includes('/admin/invoices')) {
      return Promise.resolve({ invoices: [], total: 0 });
    }
    if (url.includes('/admin/access/levels')) {
      return Promise.resolve({ levels: [] });
    }
    return Promise.resolve({});
  });
}

describe('UserEdit — Add-ons Tab', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin/users', name: 'users', component: { template: '<div>Users</div>' } },
        { path: '/admin/users/:id/edit', name: 'user-edit', component: UserEdit },
        { path: '/admin/subscriptions/:id', name: 'subscription-details', component: { template: '<div>Sub</div>' } },
        { path: '/admin/invoices/:id', name: 'invoice-details', component: { template: '<div>Inv</div>' } },
      ]
    });

    await router.push('/admin/users/1/edit');
  });

  it('renders add-ons tab button', async () => {
    setupApiMocks();

    const wrapper = mount(UserEdit, {
      global: {
        plugins: [router],
        mocks: { $t: (key: string) => key }
      }
    });

    await flushPromises();

    const tabBtn = wrapper.find('[data-testid="tab-addons"]');
    expect(tabBtn.exists()).toBe(true);
  });

  it('clicking tab calls fetchUserAddons', async () => {
    setupApiMocks();

    const wrapper = mount(UserEdit, {
      global: {
        plugins: [router],
        mocks: { $t: (key: string) => key }
      }
    });

    await flushPromises();

    const tabBtn = wrapper.find('[data-testid="tab-addons"]');
    await tabBtn.trigger('click');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/users/1/addons');
  });

  it('table renders addon subscriptions', async () => {
    setupApiMocks();

    const wrapper = mount(UserEdit, {
      global: {
        plugins: [router],
        mocks: { $t: (key: string) => key }
      }
    });

    await flushPromises();

    // Switch to addons tab
    await wrapper.find('[data-testid="tab-addons"]').trigger('click');
    await flushPromises();

    const table = wrapper.find('[data-testid="user-addons-table"]');
    expect(table.exists()).toBe(true);

    const rows = table.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Extra Storage');
    expect(rows[1].text()).toContain('Priority Support');
  });

  it('payment status badge displays correctly', async () => {
    setupApiMocks();

    const wrapper = mount(UserEdit, {
      global: {
        plugins: [router],
        mocks: { $t: (key: string) => key }
      }
    });

    await flushPromises();

    await wrapper.find('[data-testid="tab-addons"]').trigger('click');
    await flushPromises();

    const badges = wrapper.findAll('.status-badge.paid');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('invoice links are clickable', async () => {
    setupApiMocks();

    const wrapper = mount(UserEdit, {
      global: {
        plugins: [router],
        mocks: { $t: (key: string) => key }
      }
    });

    await flushPromises();

    await wrapper.find('[data-testid="tab-addons"]').trigger('click');
    await flushPromises();

    const invoiceLinks = wrapper.findAll('[data-testid="first-invoice-link"]');
    expect(invoiceLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no addons', async () => {
    setupApiMocks({ addons: { addon_subscriptions: [] } });

    const wrapper = mount(UserEdit, {
      global: {
        plugins: [router],
        mocks: { $t: (key: string) => key }
      }
    });

    await flushPromises();

    await wrapper.find('[data-testid="tab-addons"]').trigger('click');
    await flushPromises();

    const empty = wrapper.find('[data-testid="addons-empty-state"]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain('users.noAddonsForUser');
  });
});
