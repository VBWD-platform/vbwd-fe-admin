import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Users from '@/views/Users.vue';
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

describe('Users.vue', () => {
  let router: ReturnType<typeof createRouter>;

  const mockUsers = [
    { id: '1', email: 'user1@test.com', name: 'User One', is_active: true, role: 'USER', created_at: '2025-01-01' },
    { id: '2', email: 'user2@test.com', name: 'User Two', is_active: false, role: 'ADMIN', created_at: '2025-01-02' },
    { id: '3', email: 'user3@test.com', name: 'User Three', is_active: true, role: 'USER', created_at: '2025-01-03' }
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
        { path: '/', redirect: '/admin/users' },
        { path: '/admin/users', name: 'users', component: Users },
        { path: '/admin/users/:id', name: 'user-details', component: { template: '<div>User Details</div>' } },
        { path: '/admin/users/:id/edit', name: 'user-edit', component: { template: '<div>User Edit</div>' } }
      ]
    });

    // Default mock response
    vi.mocked(api.get).mockResolvedValue({
      users: mockUsers,
      total: 3,
      page: 1,
      per_page: 20
    });
  });

  it('renders users table with data', async () => {
    const wrapper = mount(Users, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    // Check table headers
    expect(wrapper.find('[data-testid="users-table"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Email');
    expect(wrapper.text()).toContain('Name');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Role');
  });

  it('displays user data in table rows', async () => {
    const wrapper = mount(Users, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('user1@test.com');
    expect(wrapper.text()).toContain('User One');
    expect(wrapper.text()).toContain('user2@test.com');
    expect(wrapper.text()).toContain('User Two');
  });

  it('shows loading state while fetching users', async () => {
    // Create a promise that never resolves to keep loading state
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

    const wrapper = mount(Users, {
      global: {
        plugins: [router]
      }
    });

    // Need to wait for next tick for Vue to process the state change
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
  });

  it('displays active/inactive status badges', async () => {
    const wrapper = mount(Users, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const activeBadges = wrapper.findAll('[data-testid="status-active"]');
    const inactiveBadges = wrapper.findAll('[data-testid="status-inactive"]');

    expect(activeBadges.length).toBe(2); // User One and User Three
    expect(inactiveBadges.length).toBe(1); // User Two
  });

  it('filters users by search query', async () => {
    const wrapper = mount(Users, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const searchInput = wrapper.find('[data-testid="search-input"]');
    await searchInput.setValue('user1');

    // Trigger search (debounced or on enter)
    await searchInput.trigger('keyup.enter');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/users', expect.objectContaining({
      params: expect.objectContaining({ search: 'user1' })
    }));
  });

  it('filters users by status', async () => {
    const wrapper = mount(Users, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const statusFilter = wrapper.find('[data-testid="status-filter"]');
    await statusFilter.setValue('active');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/users', expect.objectContaining({
      params: expect.objectContaining({ status: 'active' })
    }));
  });

  it('navigates to user details on row click', async () => {
    await router.push('/admin/users');

    const wrapper = mount(Users, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    const firstRow = wrapper.find('[data-testid="user-row-1"]');
    await firstRow.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/admin/users/1/edit');
  });

  it('handles pagination', async () => {
    vi.mocked(api.get).mockResolvedValue({
      users: mockUsers,
      total: 100,
      page: 1,
      per_page: 20
    });

    const wrapper = mount(Users, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    // Check pagination exists
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(true);

    // Click next page
    const nextBtn = wrapper.find('[data-testid="pagination-next"]');
    await nextBtn.trigger('click');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/users', expect.objectContaining({
      params: expect.objectContaining({ page: 2 })
    }));
  });

  it('displays error message on fetch failure', async () => {
    // Suppress console errors for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(api.get).mockRejectedValue(new Error('Failed to fetch users'));

    const wrapper = mount(Users, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Failed to fetch users');

    consoleSpy.mockRestore();
  });

  it('shows empty state when no users found', async () => {
    vi.mocked(api.get).mockResolvedValue({
      users: [],
      total: 0,
      page: 1,
      per_page: 20
    });

    const wrapper = mount(Users, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('No results found');
  });

  it('displays total users count', async () => {
    vi.mocked(api.get).mockResolvedValue({
      users: mockUsers,
      total: 150,
      page: 1,
      per_page: 20
    });

    const wrapper = mount(Users, {
      global: {
        plugins: [router]
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('150');
  });
});
