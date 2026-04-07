import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import AdminLayout from '@/layouts/AdminLayout.vue';
import { useAuthStore, configureAuthStore } from '@/stores/auth';
import { api } from '@/api';

// Mock the API module
vi.mock('@/api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    setToken: vi.fn(),
    clearToken: vi.fn()
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn()
}));

describe('AdminLayout.vue', () => {
  let router: ReturnType<typeof createRouter>;
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();

    // Configure auth store to use our mocked api
    configureAuthStore({
      apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
      storageKey: 'admin_token',
    });

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/admin/dashboard' },
        { path: '/admin/login', name: 'login', component: { template: '<div>Login</div>' } },
        { path: '/admin/dashboard', name: 'dashboard', component: { template: '<div class="test-content">Dashboard Content</div>' } },
        { path: '/admin/users', name: 'users', component: { template: '<div>Users</div>' } },
        { path: '/admin/plans', name: 'plans', component: { template: '<div>Plans</div>' } },
        { path: '/admin/analytics', name: 'analytics', component: { template: '<div>Analytics</div>' } },
        { path: '/admin/profile', name: 'profile', component: { template: '<div>Profile</div>' } },
        { path: '/admin/add-ons', name: 'add-ons', component: { template: '<div>Add-Ons</div>' } },
        { path: '/admin/subscriptions', name: 'subscriptions', component: { template: '<div>Subscriptions</div>' } },
        { path: '/admin/invoices', name: 'invoices', component: { template: '<div>Invoices</div>' } },
        { path: '/admin/settings', name: 'settings', component: { template: '<div>Settings</div>' } },
        { path: '/admin/payment-methods', name: 'payment-methods', component: { template: '<div>Payment Methods</div>' } }
      ]
    });

    // Set up authenticated state
    const authStore = useAuthStore();
    authStore.$patch({
      token: 'test-token',
      user: {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'SUPER_ADMIN',
        permissions: ['*']
      },
    });
  });

  it('renders admin layout with sidebar and topbar', async () => {
    const wrapper = mount(AdminLayout, {
      global: {
        plugins: [pinia, router],
        stubs: {
          AdminSidebar: true,
          AdminTopbar: true
        }
      }
    });

    expect(wrapper.find('.admin-layout').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'AdminSidebar' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'AdminTopbar' }).exists()).toBe(true);
  });

  it('renders route content in main area', async () => {
    await router.push('/admin/dashboard');

    const wrapper = mount(AdminLayout, {
      global: {
        plugins: [pinia, router]
      }
    });

    await flushPromises();

    expect(wrapper.find('.test-content').exists()).toBe(true);
    expect(wrapper.find('.test-content').text()).toBe('Dashboard Content');
  });

  it('displays user email in sidebar', async () => {
    const wrapper = mount(AdminLayout, {
      global: {
        plugins: [pinia, router]
      }
    });

    expect(wrapper.text()).toContain('admin@test.com');
  });

  it('has navigation links to admin sections', async () => {
    const wrapper = mount(AdminLayout, {
      global: {
        plugins: [pinia, router]
      }
    });

    // Check for navigation links
    const links = wrapper.findAll('a');
    const hrefs = links.map(link => link.attributes('href'));

    expect(hrefs).toContain('/admin/dashboard');
    expect(hrefs).toContain('/admin/users');
    expect(hrefs).toContain('/admin/invoices');
  });

  it('logs out when logout button is clicked', async () => {
    await router.push('/admin/dashboard');

    const wrapper = mount(AdminLayout, {
      global: {
        plugins: [pinia, router]
      }
    });

    await flushPromises();

    const authStore = useAuthStore();
    expect(authStore.isAuthenticated).toBe(true);

    // Open user menu first (logout is in a dropdown)
    const userMenu = wrapper.find('[data-testid="user-menu"]');
    await userMenu.trigger('click');
    await flushPromises();

    // Find and click logout button
    const logoutBtn = wrapper.find('[data-testid="logout-button"]');
    await logoutBtn.trigger('click');
    await flushPromises();

    expect(authStore.isAuthenticated).toBe(false);
    expect(router.currentRoute.value.path).toBe('/admin/login');
  });

  it('highlights active navigation item', async () => {
    await router.push('/admin/dashboard');

    const wrapper = mount(AdminLayout, {
      global: {
        plugins: [pinia, router]
      }
    });

    await flushPromises();

    const dashboardLink = wrapper.find('a[href="/admin/dashboard"]');
    expect(dashboardLink.classes()).toContain('router-link-active');
  });

  it('shows admin brand in sidebar', async () => {
    const wrapper = mount(AdminLayout, {
      global: {
        plugins: [pinia, router]
      }
    });

    expect(wrapper.text()).toContain('VBWD Admin');
  });
});
