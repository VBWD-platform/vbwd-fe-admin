import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Login from '@/views/Login.vue';
import { useAuthStore, configureAuthStore } from '@/stores/auth';
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

describe('Login.vue', () => {
  let router: ReturnType<typeof createRouter>;
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    localStorage.clear();

    // Configure auth store to use our mocked api
    configureAuthStore({
      apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
      storageKey: 'admin_token',
    });

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/admin/login' },
        { path: '/admin/login', name: 'login', component: Login },
        { path: '/admin/dashboard', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
        { path: '/admin/forbidden', name: 'forbidden', component: { template: '<div>Forbidden</div>' } }
      ]
    });
  });

  it('renders login form correctly', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [pinia, router]
      }
    });

    expect(wrapper.find('h1').text()).toContain('Login');
    expect(wrapper.find('input#username').exists()).toBe(true);
    expect(wrapper.find('input#password').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('shows loading state while logging in', async () => {
    vi.mocked(api.post).mockImplementation(() => new Promise(() => {})); // Never resolves

    const wrapper = mount(Login, {
      global: {
        plugins: [pinia, router]
      }
    });

    await wrapper.find('input#username').setValue('admin@test.com');
    await wrapper.find('input#password').setValue('password');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.find('button[type="submit"]').text()).toContain('Signing in');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('displays error message on failed login', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Invalid credentials'));

    const wrapper = mount(Login, {
      global: {
        plugins: [pinia, router]
      }
    });

    await wrapper.find('input#username').setValue('admin@test.com');
    await wrapper.find('input#password').setValue('wrongpassword');
    await wrapper.find('form').trigger('submit');

    await flushPromises();

    expect(wrapper.find('.error').exists()).toBe(true);
    expect(wrapper.find('.error').text()).toContain('Invalid credentials');
  });

  it('redirects to dashboard on successful admin login', async () => {
    vi.mocked(api.post).mockResolvedValue({
      token: 'test-admin-token',
      user: {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'ADMIN'
      }
    });

    await router.push('/admin/login');

    const wrapper = mount(Login, {
      global: {
        plugins: [pinia, router]
      }
    });

    await wrapper.find('input#username').setValue('admin@test.com');
    await wrapper.find('input#password').setValue('admin123');
    await wrapper.find('form').trigger('submit');

    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/dashboard');
  });

  it('redirects to forbidden page when user has no admin role', async () => {
    vi.mocked(api.post).mockResolvedValue({
      token: 'test-user-token',
      user: {
        id: '2',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'USER'  // No admin role
      }
    });

    await router.push('/admin/login');

    const wrapper = mount(Login, {
      global: {
        plugins: [pinia, router]
      }
    });

    await wrapper.find('input#username').setValue('user@test.com');
    await wrapper.find('input#password').setValue('user123');
    await wrapper.find('form').trigger('submit');

    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/forbidden');
  });

  it('stores token in localStorage on successful login', async () => {
    vi.mocked(api.post).mockResolvedValue({
      token: 'test-admin-token',
      user: {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'ADMIN'
      }
    });

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const wrapper = mount(Login, {
      global: {
        plugins: [pinia, router]
      }
    });

    await wrapper.find('input#username').setValue('admin@test.com');
    await wrapper.find('input#password').setValue('admin123');
    await wrapper.find('form').trigger('submit');

    await flushPromises();

    expect(setItemSpy).toHaveBeenCalledWith('admin_token', 'test-admin-token');
    setItemSpy.mockRestore();
  });

  it('updates auth store on successful login', async () => {
    vi.mocked(api.post).mockResolvedValue({
      token: 'test-admin-token',
      user: {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'ADMIN'
      }
    });

    const wrapper = mount(Login, {
      global: {
        plugins: [pinia, router]
      }
    });

    await wrapper.find('input#username').setValue('admin@test.com');
    await wrapper.find('input#password').setValue('admin123');
    await wrapper.find('form').trigger('submit');

    await flushPromises();

    const authStore = useAuthStore();
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.user?.email).toBe('admin@test.com');
    expect(authStore.user?.role).toBe('ADMIN');
  });
});
