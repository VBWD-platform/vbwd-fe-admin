/**
 * The admin Profile address section carries a State / Region field: it is
 * populated from the fetched details on load, bound to the model, and included
 * in the PUT /admin/profile payload on save.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, getActivePinia } from 'pinia';
import Profile from '@/views/Profile.vue';

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    put: (...args: unknown[]) => mockPut(...args),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  setLocale: vi.fn(),
}));

function mountComponent() {
  return mount(Profile, {
    global: {
      plugins: [getActivePinia()!],
      mocks: { $t: (key: string) => key },
    },
  });
}

describe('Profile — State / Region field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/profile') {
        return Promise.resolve({
          user: {
            email: 'admin@test.com',
            role: 'admin',
            details: { city: 'Munich', state: 'Bavaria', postal_code: '80331' },
          },
        });
      }
      return Promise.resolve({ languages: [], default: 'en' });
    });
    mockPut.mockResolvedValue({});
  });

  it('renders the state input populated from fetched details', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const input = wrapper.find('[data-testid="state-input"]');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('Bavaria');
  });

  it('includes state in the PUT /admin/profile payload', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await wrapper.find('[data-testid="state-input"]').setValue('Saxony');
    await wrapper.find('[data-testid="save-button"]').trigger('click');
    await flushPromises();
    expect(mockPut).toHaveBeenCalledWith(
      '/admin/profile',
      expect.objectContaining({ state: 'Saxony' }),
    );
  });
});
