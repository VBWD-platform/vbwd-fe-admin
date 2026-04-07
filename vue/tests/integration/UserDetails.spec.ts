import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import UserDetails from '@/views/UserDetails.vue';
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

describe('UserDetails.vue', () => {
  let router: ReturnType<typeof createRouter>;

  const mockUser = {
    id: '1',
    email: 'user@test.com',
    name: 'Test User',
    is_active: true,
    role: 'ADMIN',
    access_levels: [{id: '1', slug: 'editor', name: 'Editor'}],
    created_at: '2025-01-01T10:00:00Z',
    subscription: {
      plan: 'Pro',
      status: 'active',
      expires_at: '2026-01-01T10:00:00Z'
    },
    stats: {
      total_payments: 150,
      last_login: '2025-12-15T14:30:00Z'
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
        { path: '/admin/users', name: 'users', component: { template: '<div>Users</div>' } },
        { path: '/admin/users/:id', name: 'user-details', component: UserDetails }
      ]
    });

    // Default mock response
    vi.mocked(api.get).mockResolvedValue({ user: mockUser });
  });

  it('fetches user details on mount', async () => {
    await router.push('/admin/users/1');

    mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/users/1');
  });

  it('displays user information', async () => {
    await router.push('/admin/users/1');

    const wrapper = mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('user@test.com');
    expect(wrapper.text()).toContain('Test User');
  });

  it('displays subscription information', async () => {
    await router.push('/admin/users/1');

    const wrapper = mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Pro');
    expect(wrapper.text()).toContain('active');
  });

  it('displays user stats', async () => {
    await router.push('/admin/users/1');

    const wrapper = mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('150');
  });

  it('displays user roles', async () => {
    await router.push('/admin/users/1');

    const wrapper = mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('user');
    expect(wrapper.text()).toContain('ADMIN');
  });

  it('shows active status badge for active user', async () => {
    await router.push('/admin/users/1');

    const wrapper = mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="status-active"]').exists()).toBe(true);
  });

  it('shows inactive status badge for inactive user', async () => {
    vi.mocked(api.get).mockResolvedValue({
      user: { ...mockUser, is_active: false }
    });

    await router.push('/admin/users/1');

    const wrapper = mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="status-inactive"]').exists()).toBe(true);
  });

  it('can suspend an active user', async () => {
    vi.mocked(api.post).mockResolvedValue({ message: 'User suspended' });

    await router.push('/admin/users/1');

    const wrapper = mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const suspendBtn = wrapper.find('[data-testid="suspend-button"]');
    await suspendBtn.trigger('click');

    // Should show suspend dialog or directly call API
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/admin/users/1/suspend', expect.any(Object));
  });

  it('can activate a suspended user', async () => {
    vi.mocked(api.get).mockResolvedValue({
      user: { ...mockUser, is_active: false }
    });
    vi.mocked(api.post).mockResolvedValue({ message: 'User activated' });

    await router.push('/admin/users/1');

    const wrapper = mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const activateBtn = wrapper.find('[data-testid="activate-button"]');
    await activateBtn.trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/admin/users/1/activate');
  });

  it('navigates back to users list', async () => {
    await router.push('/admin/users/1');

    const wrapper = mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const backBtn = wrapper.find('[data-testid="back-button"]');
    await backBtn.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/users');
  });

  it('shows loading state while fetching', async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

    await router.push('/admin/users/1');

    const wrapper = mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
  });

  it('shows error state on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValue(new Error('User not found'));

    await router.push('/admin/users/1');

    const wrapper = mount(UserDetails, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('User not found');

    consoleSpy.mockRestore();
  });
});
