import { defineStore } from 'pinia';
import { api } from '@/api';

export interface AccessLevel {
  id: string;
  slug: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  role: string;
  access_levels?: AccessLevel[];
  user_access_levels?: AccessLevel[];
  created_at?: string;
}

export interface DeletionDependency {
  type: string;
  count: number;
  label: string;
}

export interface DeletionInfo {
  user_id: string;
  email: string;
  has_cascade_dependencies: boolean;
  // Generic, plugin-contributed cascade dependencies (core names no domain).
  dependencies: DeletionDependency[];
}

export interface UserDetail extends User {
  stats?: {
    total_payments: number;
    last_login?: string | null;
  };
  daily_taro_sessions_used?: number;
  daily_taro_limit?: number;
}

export interface FetchUsersParams {
  page: number;
  per_page: number;
  search?: string;
  status?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  status?: string;
  role?: string;
  details?: {
    first_name?: string;
    last_name?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
  };
}

export interface FetchUsersResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
}

export const useUsersStore = defineStore('users', {
  state: () => ({
    users: [] as User[],
    selectedUser: null as UserDetail | null,
    total: 0,
    page: 1,
    perPage: 20,
    loading: false,
    error: null as string | null
  }),

  getters: {
    hasUsers: (state): boolean => state.users.length > 0,
    totalPages: (state): number => Math.ceil(state.total / state.perPage)
  },

  actions: {
    async fetchUsers(params: FetchUsersParams): Promise<FetchUsersResponse> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get('/admin/users', {
          params: {
            page: params.page,
            per_page: params.per_page,
            search: params.search || '',
            status: params.status || ''
          }
        }) as FetchUsersResponse;

        this.users = response.users;
        this.total = response.total;
        this.page = response.page;
        this.perPage = response.per_page;
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch users';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchUser(userId: string): Promise<UserDetail> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.get(`/admin/users/${userId}`) as { user: UserDetail };
        this.selectedUser = response.user;
        return response.user;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to fetch user';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createUser(data: CreateUserData): Promise<User> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post('/admin/users/', data) as User;
        // Add to local list
        this.users.unshift(response);
        this.total += 1;
        return response;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to create user';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateUser(userId: string, data: Partial<User>): Promise<User> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.put(`/admin/users/${userId}`, data) as { user: User };
        const updatedUser = response.user;

        // Update local state with response from server
        if (this.selectedUser?.id === userId) {
          this.selectedUser = { ...this.selectedUser, ...updatedUser };
        }

        // Update in list if present
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
          this.users[index] = { ...this.users[index], ...updatedUser };
        }

        return updatedUser;
      } catch (error) {
        this.error = (error as Error).message || 'Failed to update user';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async suspendUser(userId: string, reason: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.post(`/admin/users/${userId}/suspend`, { reason });

        // Update local state
        if (this.selectedUser?.id === userId) {
          this.selectedUser.is_active = false;
        }
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
          this.users[index].is_active = false;
        }
      } catch (error) {
        this.error = (error as Error).message || 'Failed to suspend user';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async activateUser(userId: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.post(`/admin/users/${userId}/activate`);

        // Update local state
        if (this.selectedUser?.id === userId) {
          this.selectedUser.is_active = true;
        }
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
          this.users[index].is_active = true;
        }
      } catch (error) {
        this.error = (error as Error).message || 'Failed to activate user';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateUserAccessLevels(userId: string, accessLevelSlugs: string[]): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await api.put(`/admin/users/${userId}/roles`, { roles: accessLevelSlugs });

        // Update local state — convert slug strings to access level objects
        const accessLevelObjects = accessLevelSlugs.map(slug => ({ id: '', slug, name: slug }));
        if (this.selectedUser?.id === userId) {
          this.selectedUser.access_levels = accessLevelObjects;
        }
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
          this.users[index].access_levels = accessLevelObjects;
        }
      } catch (error) {
        this.error = (error as Error).message || 'Failed to update access levels';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async getDeletionInfo(userId: string): Promise<DeletionInfo> {
      this.error = null;

      try {
        const response = await api.get(`/admin/users/${userId}/deletion-info`) as { user_id: string; email: string; has_cascade_dependencies: boolean; dependencies?: DeletionDependency[] };
        return {
          user_id: response.user_id,
          email: response.email,
          has_cascade_dependencies: response.has_cascade_dependencies,
          dependencies: response.dependencies ?? [],
        };
      } catch (error) {
        this.error = (error as Error).message || 'Failed to get deletion info';
        throw error;
      }
    },

    async deleteUser(userId: string, force: boolean = false): Promise<void> {
      this.error = null;

      try {
        await api.delete(`/admin/users/${userId}`, { data: { force } });

        // Update local state
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
          this.users.splice(index, 1);
          this.total -= 1;
        }

        if (this.selectedUser?.id === userId) {
          this.selectedUser = null;
        }
      } catch (error) {
        // Extract error message from API response if available
        let errorMessage = 'Failed to delete user';
        if (error instanceof Error) {
          // Try to extract error from API response
          const apiError = (error as any).response?.data?.error;
          if (apiError) {
            errorMessage = apiError;
          } else {
            errorMessage = error.message;
          }
        }
        this.error = errorMessage;
        throw new Error(errorMessage);
      }
    },


    async impersonateUser(userId: string): Promise<{ token: string; expires_in: number }> {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post(`/admin/users/${userId}/impersonate`);
        return response as { token: string; expires_in: number };
      } catch (error) {
        this.error = (error as Error).message || 'Failed to impersonate user';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearSelectedUser(): void {
      this.selectedUser = null;
    },

    async resetTaroSessions(userId: string): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post(`/taro/admin/users/${userId}/reset-sessions`) as {
          success: boolean;
          reset_count: number;
          daily_limit: number;
          daily_remaining: number;
          daily_used: number;
        };

        // Update selected user with reset data if it's the one being reset
        if (this.selectedUser && this.selectedUser.id === userId && response.success) {
          this.selectedUser.daily_taro_sessions_used = response.daily_used;
          this.selectedUser.daily_taro_limit = response.daily_limit;
        }
      } catch (error) {
        this.error = (error as Error).message || 'Failed to reset Taro sessions';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    reset(): void {
      this.users = [];
      this.selectedUser = null;
      this.total = 0;
      this.page = 1;
      this.error = null;
      this.loading = false;
    }
  }
});
