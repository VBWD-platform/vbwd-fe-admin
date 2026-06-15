import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { AppEvents, eventBus } from 'vbwd-view-component';
import NotificationHost from '@/components/NotificationHost.vue';

/**
 * NotificationHost is the app-wide toast renderer. It subscribes to the fe-core
 * eventBus `notification:show` events and renders a stacked, auto-dismissing
 * fly-out. Teleports to body, so we assert against document.body.
 */
describe('NotificationHost.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders a toast when a notification:show event is emitted', async () => {
    mount(NotificationHost);
    eventBus.emit(AppEvents.NOTIFICATION_SHOW, {
      type: 'success',
      message: 'AI content generation is done',
    });
    await flushPromises();
    const toast = document.body.querySelector('[data-testid="app-toast"]');
    expect(toast).not.toBeNull();
    expect(toast?.textContent).toContain('AI content generation is done');
  });

  it('applies the variant class matching the notification type', async () => {
    mount(NotificationHost);
    eventBus.emit(AppEvents.NOTIFICATION_SHOW, { type: 'success', message: 'done' });
    await flushPromises();
    const toast = document.body.querySelector('[data-testid="app-toast"]');
    expect(toast?.className).toContain('app-toast--success');
  });

  it('auto-dismisses the toast after the default duration', async () => {
    mount(NotificationHost);
    eventBus.emit(AppEvents.NOTIFICATION_SHOW, { type: 'success', message: 'done' });
    await flushPromises();
    expect(document.body.querySelector('[data-testid="app-toast"]')).not.toBeNull();
    vi.advanceTimersByTime(4000);
    await flushPromises();
    expect(document.body.querySelector('[data-testid="app-toast"]')).toBeNull();
  });

  it('stacks multiple toasts', async () => {
    mount(NotificationHost);
    eventBus.emit(AppEvents.NOTIFICATION_SHOW, { type: 'success', message: 'first' });
    eventBus.emit(AppEvents.NOTIFICATION_SHOW, { type: 'info', message: 'second' });
    await flushPromises();
    expect(document.body.querySelectorAll('[data-testid="app-toast"]')).toHaveLength(2);
  });
});
