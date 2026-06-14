/**
 * The admin user-create form's role selector must offer all six canonical
 * core roles, including the server-provisioned BOT and GUEST identities.
 * BOT accounts back chat bots; GUEST is the public-visitor identity. Both are
 * non-interactive-login by the backend auth guard, but the admin form must
 * still be able to CREATE them.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, getActivePinia } from 'pinia';
import UserCreate from '@/views/UserCreate.vue';

vi.mock('@/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
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

describe('UserCreate — role selector canonical options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('offers every canonical role including BOT and GUEST', () => {
    const wrapper = mountComponent();
    const optionValues = wrapper
      .find('select#role')
      .findAll('option')
      .map((option) => (option.element as HTMLOptionElement).value);

    expect(optionValues).toEqual(
      expect.arrayContaining([
        'USER',
        'ADMIN',
        'VENDOR',
        'SUPER_ADMIN',
        'BOT',
        'GUEST',
      ]),
    );
  });
});
