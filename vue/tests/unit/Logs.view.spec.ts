/**
 * Logs.vue — the centralized-log Logs view (S106.3).
 *
 * The view renders a filter bar (scope multiselect, level, stream, time window,
 * text contains), a monospace newest-first record list, a "Load more" control
 * gated on `truncated`/`nextCursor`, a Live-tail toggle and a Download button.
 * It delegates all I/O to `useLogsStore`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import Logs from '@/views/Logs.vue';
import { api } from '@/api';

vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

function mockScopes(): void {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/logs/scopes') {
      return Promise.resolve({
        scopes: ['core', 'shop'],
        streams: ['error', 'warnings', 'info', 'events'],
      });
    }
    // /admin/logs query
    return Promise.resolve({
      records: [
        {
          ts: 1_700_000_200,
          level: 'error',
          scope: 'core',
          stream: 'error',
          logger: 'vbwd.core',
          msg: 'boom',
        },
        {
          ts: 1_700_000_100,
          event: 'user.login',
          payload: { user_id: 'abc' },
          scope: 'core',
          stream: 'events',
        },
      ],
      next_cursor: 'cursor-1',
      truncated: true,
    });
  });
}

describe('Logs.vue (S106.3)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockScopes();
  });

  it('fetches scopes on mount and offers them as filter options', async () => {
    const wrapper = mount(Logs);
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/admin/logs/scopes');
    const scopeOptions = wrapper.findAll('[data-testid="logs-scope-option"]');
    expect(scopeOptions.map((option) => option.text())).toContain('core');
    expect(scopeOptions.map((option) => option.text())).toContain('shop');
  });

  it('queries logs and renders records newest-first with level + scope + msg', async () => {
    const wrapper = mount(Logs);
    await flushPromises();

    await wrapper.find('[data-testid="logs-query-button"]').trigger('click');
    await flushPromises();

    const rows = wrapper.findAll('[data-testid="logs-record-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('boom');
    expect(rows[0].text().toLowerCase()).toContain('error');
    expect(rows[0].text()).toContain('core');
  });

  it('renders an events-stream record using event + payload', async () => {
    const wrapper = mount(Logs);
    await flushPromises();
    await wrapper.find('[data-testid="logs-query-button"]').trigger('click');
    await flushPromises();

    const rows = wrapper.findAll('[data-testid="logs-record-row"]');
    expect(rows[1].text()).toContain('user.login');
  });

  it('shows "Load more" when the result is truncated and calls loadMore with the cursor', async () => {
    const wrapper = mount(Logs);
    await flushPromises();
    await wrapper.find('[data-testid="logs-query-button"]').trigger('click');
    await flushPromises();

    const loadMore = wrapper.find('[data-testid="logs-load-more"]');
    expect(loadMore.exists()).toBe(true);

    vi.mocked(api.get).mockResolvedValueOnce({
      records: [
        {
          ts: 1_700_000_050,
          level: 'info',
          scope: 'core',
          stream: 'info',
          logger: 'vbwd.core',
          msg: 'older line',
        },
      ],
      next_cursor: null,
      truncated: false,
    });
    await loadMore.trigger('click');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith(
      '/admin/logs',
      expect.objectContaining({ params: expect.objectContaining({ cursor: 'cursor-1' }) }),
    );
    expect(wrapper.findAll('[data-testid="logs-record-row"]')).toHaveLength(3);
  });

  it('toggles live tail on and off', async () => {
    const wrapper = mount(Logs);
    await flushPromises();

    const tailToggle = wrapper.find('[data-testid="logs-tail-toggle"]');
    await tailToggle.trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="logs-tail-toggle"]').classes()).toContain('active');

    await wrapper.find('[data-testid="logs-tail-toggle"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="logs-tail-toggle"]').classes()).not.toContain('active');
  });
});
