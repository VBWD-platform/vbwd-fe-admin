/**
 * When creating a user is refused by the seat/token provisioning guard, the
 * admin form must surface the guard's message AND render the `action` as a real
 * clickable hyperlink (an `<a>`) pointing at the fe-user app (a different
 * origin) so the operator can go buy tokens / upgrade the plan. A plain
 * (non-provisioning) error keeps the existing flat `submit-error` path.
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

interface StructuredError extends Error {
  status?: number;
  data?: { error?: string; code?: string; action?: { label: string; url: string } };
}

function structuredRejection(
  status: number,
  code: string,
  message: string,
  action: { label: string; url: string },
): StructuredError {
  const error = new Error(message) as StructuredError;
  error.status = status;
  error.data = { error: message, code, action };
  return error;
}

function mountComponent() {
  return mount(UserCreate, {
    global: {
      plugins: [getActivePinia()!],
      mocks: { $t: (key: string) => key },
    },
  });
}

async function submitValidForm(wrapper: ReturnType<typeof mountComponent>) {
  await wrapper.find('#email').setValue('new-admin@example.com');
  await wrapper.find('#password').setValue('StrongPass123');
  await wrapper.find('[data-testid="user-form"]').trigger('submit.prevent');
  await flushPromises();
}

describe('UserCreate — provisioning refusal hyperlink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('renders the message and a "Buy tokens" link for a 402 TOKENS_REQUIRED refusal', async () => {
    postMock.mockRejectedValue(
      structuredRejection(
        402,
        'TOKENS_REQUIRED',
        'Not enough tokens to create this admin (need 5, have 1). Buy tokens to continue.',
        { label: 'Buy tokens', url: '/dashboard/tokens' },
      ),
    );
    const wrapper = mountComponent();

    await submitValidForm(wrapper);

    const block = wrapper.find('[data-testid="provisioning-error"]');
    expect(block.exists()).toBe(true);
    expect(block.text()).toContain('Buy tokens to continue');

    const link = wrapper.find('[data-testid="provisioning-action-link"]');
    expect(link.exists()).toBe(true);
    expect(link.element.tagName).toBe('A');
    expect(link.text()).toBe('Buy tokens');
    expect(link.attributes('href')).toMatch(/\/dashboard\/tokens$/);
  });

  it('renders an "Upgrade plan" checkout link for a 403 SEAT_LIMIT_REACHED refusal', async () => {
    postMock.mockRejectedValue(
      structuredRejection(
        403,
        'SEAT_LIMIT_REACHED',
        'Seat limit reached (3 of 3 used). Upgrade your plan to add more admins.',
        { label: 'Upgrade plan', url: '/checkout?tarif_plan_id=pro' },
      ),
    );
    const wrapper = mountComponent();

    await submitValidForm(wrapper);

    const link = wrapper.find('[data-testid="provisioning-action-link"]');
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe('Upgrade plan');
    expect(link.attributes('href')).toContain('/checkout');
  });

  it('falls back to the plain submit-error path for a non-provisioning error', async () => {
    postMock.mockRejectedValue(new Error('Something broke'));
    const wrapper = mountComponent();

    await submitValidForm(wrapper);

    expect(wrapper.find('[data-testid="submit-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="provisioning-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="provisioning-action-link"]').exists()).toBe(false);
  });
});
