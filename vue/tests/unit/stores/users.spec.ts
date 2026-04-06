import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUsersStore } from '@/stores/users';
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

describe('UsersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const store = useUsersStore();

    expect(store.users).toEqual([]);
    expect(store.selectedUser).toBeNull();
    expect(store.total).toBe(0);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('fetches users list with pagination', async () => {
    const store = useUsersStore();

    const mockUsers = [
      { id: '1', email: 'user1@test.com', name: 'User 1', is_active: true, roles: ['user'] },
      { id: '2', email: 'user2@test.com', name: 'User 2', is_active: true, roles: ['admin'] }
    ];

    vi.mocked(api.get).mockResolvedValue({
      users: mockUsers,
      total: 100,
      page: 1,
      per_page: 20
    });

    await store.fetchUsers({ page: 1, per_page: 20 });

    expect(api.get).toHaveBeenCalledWith('/admin/users', {
      params: { page: 1, per_page: 20, search: '', status: '' }
    });
    expect(store.users).toEqual(mockUsers);
    expect(store.total).toBe(100);
  });

  it('fetches users with search filter', async () => {
    const store = useUsersStore();

    vi.mocked(api.get).mockResolvedValue({ users: [], total: 0, page: 1, per_page: 20 });

    await store.fetchUsers({ page: 1, per_page: 20, search: 'test@', status: 'active' });

    expect(api.get).toHaveBeenCalledWith('/admin/users', {
      params: { page: 1, per_page: 20, search: 'test@', status: 'active' }
    });
  });

  it('fetches single user details', async () => {
    const store = useUsersStore();

    const mockUser = {
      id: '1',
      email: 'user@test.com',
      name: 'Test User',
      is_active: true,
      roles: ['user'],
      subscription: { plan: 'Pro', status: 'active' },
      stats: { total_payments: 100 }
    };

    vi.mocked(api.get).mockResolvedValue({ user: mockUser });

    await store.fetchUser('1');

    expect(api.get).toHaveBeenCalledWith('/admin/users/1');
    expect(store.selectedUser).toEqual(mockUser);
  });

  it('updates user information', async () => {
    const store = useUsersStore();

    vi.mocked(api.put).mockResolvedValue({ message: 'User updated' });

    await store.updateUser('1', { name: 'New Name' });

    expect(api.put).toHaveBeenCalledWith('/admin/users/1', { name: 'New Name' });
  });

  it('suspends user with reason', async () => {
    const store = useUsersStore();

    vi.mocked(api.post).mockResolvedValue({ message: 'User suspended' });

    await store.suspendUser('1', 'Violation of terms');

    expect(api.post).toHaveBeenCalledWith('/admin/users/1/suspend', { reason: 'Violation of terms' });
  });

  it('activates suspended user', async () => {
    const store = useUsersStore();

    vi.mocked(api.post).mockResolvedValue({ message: 'User activated' });

    await store.activateUser('1');

    expect(api.post).toHaveBeenCalledWith('/admin/users/1/activate');
  });

  it('updates user roles', async () => {
    const store = useUsersStore();

    vi.mocked(api.put).mockResolvedValue({ message: 'Roles updated' });

    await store.updateUserAccessLevels('1', ['admin', 'user']);

    expect(api.put).toHaveBeenCalledWith('/admin/users/1/roles', { roles: ['admin', 'user'] });
  });

  it('impersonates user', async () => {
    const store = useUsersStore();

    vi.mocked(api.post).mockResolvedValue({ token: 'impersonation_token', expires_in: 3600 });

    const result = await store.impersonateUser('1');

    expect(api.post).toHaveBeenCalledWith('/admin/users/1/impersonate');
    expect(result.token).toBe('impersonation_token');
  });

  it('handles fetch error gracefully', async () => {
    const store = useUsersStore();

    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    await expect(store.fetchUsers({ page: 1, per_page: 20 })).rejects.toThrow();
    expect(store.error).toBe('Network error');
  });

  it('resets store state', () => {
    const store = useUsersStore();
    store.users = [{ id: '1', email: 'test@test.com', name: 'Test', is_active: true, role: 'USER' }];
    store.selectedUser = { id: '1', email: 'test@test.com', name: 'Test', is_active: true, role: 'USER' };
    store.error = 'Some error';

    store.reset();

    expect(store.users).toEqual([]);
    expect(store.selectedUser).toBeNull();
    expect(store.error).toBeNull();
  });

  it('computes hasUsers correctly', async () => {
    const store = useUsersStore();

    expect(store.hasUsers).toBe(false);

    vi.mocked(api.get).mockResolvedValue({
      users: [{ id: '1', email: 'user@test.com', name: 'User', is_active: true, roles: [] }],
      total: 1,
      page: 1,
      per_page: 20
    });

    await store.fetchUsers({ page: 1, per_page: 20 });

    expect(store.hasUsers).toBe(true);
  });

  it('computes totalPages correctly', () => {
    const store = useUsersStore();
    store.total = 100;
    store.perPage = 20;

    expect(store.totalPages).toBe(5);
  });
});
