/**
 * The UserCreate address section carries a State / Region field bound to the
 * details model and included in the create payload when filled.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, getActivePinia } from 'pinia';
import UserCreate from '@/views/UserCreate.vue';

const postMock = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({}),
    post: (...args: unknown[]) => postMock(...args),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

function mountComponent() {
  return mount(UserCreate, {
    global: {
      plugins: [getActivePinia()!],
      mocks: { $t: (key: string) => key },
    },
  });
}

describe('UserCreate — State / Region field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    postMock.mockResolvedValue({ user: { id: 'new-1' } });
  });

  it('renders the state input bound to the details model', async () => {
    const wrapper = mountComponent();
    const input = wrapper.find('[data-testid="state-input"]');
    expect(input.exists()).toBe(true);
    await input.setValue('Bavaria');
    expect((input.element as HTMLInputElement).value).toBe('Bavaria');
  });

  it('includes state in the create payload when filled', async () => {
    const wrapper = mountComponent();
    await wrapper.find('#email').setValue('new-admin@example.com');
    await wrapper.find('#password').setValue('StrongPass123');
    await wrapper.find('[data-testid="state-input"]').setValue('Bavaria');
    await wrapper.find('[data-testid="user-form"]').trigger('submit.prevent');
    await flushPromises();
    expect(postMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        details: expect.objectContaining({ state: 'Bavaria' }),
      }),
    );
  });
});
