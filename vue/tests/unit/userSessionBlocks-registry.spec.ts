/**
 * User-session block extension slot.
 *
 * Mirrors `userEditTabs` / `dataExchangeTabs`: plugins contribute session
 * cleanup blocks without core naming any plugin. A block may carry a
 * `globalComponent` (rendered in Settings → User sessions, no props) and/or a
 * `userComponent` (rendered in UserEdit → Reset user sessions, props
 * userId/active). Getters return ALL blocks sorted by `order` (permission
 * filtering happens in the consuming view, like `pluginTabs`).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent } from 'vue';
import { extensionRegistry } from '@/plugins/extensionRegistry';

const GlobalStub = defineComponent({ template: '<div class="global" />' });
const UserStub = defineComponent({ template: '<div class="user" />' });

describe('extensionRegistry.userSessionBlocks', () => {
  beforeEach(() => {
    extensionRegistry.clear();
  });

  it('exposes getUserSessionGlobalBlocks() / getUserSessionUserBlocks() accessors', () => {
    expect(typeof extensionRegistry.getUserSessionGlobalBlocks).toBe('function');
    expect(typeof extensionRegistry.getUserSessionUserBlocks).toBe('function');
    expect(extensionRegistry.getUserSessionGlobalBlocks()).toEqual([]);
    expect(extensionRegistry.getUserSessionUserBlocks()).toEqual([]);
  });

  it('returns only blocks that declare the matching component', () => {
    extensionRegistry.register('meinchat-admin', {
      userSessionBlocks: [
        {
          id: 'meinchat-guest-sessions',
          label: 'Guest economy',
          requiredPermission: 'meinchat.guests.manage',
          globalComponent: GlobalStub,
          userComponent: UserStub,
        },
        {
          id: 'global-only',
          label: 'Global only',
          globalComponent: GlobalStub,
        },
        {
          id: 'user-only',
          label: 'User only',
          userComponent: UserStub,
        },
      ],
    });

    const globalIds = extensionRegistry.getUserSessionGlobalBlocks().map((b) => b.id);
    const userIds = extensionRegistry.getUserSessionUserBlocks().map((b) => b.id);
    expect(globalIds).toEqual(['meinchat-guest-sessions', 'global-only']);
    expect(userIds).toEqual(['meinchat-guest-sessions', 'user-only']);
  });

  it('sorts blocks by order (default 100)', () => {
    extensionRegistry.register('a', {
      userSessionBlocks: [{ id: 'late', label: 'Late', order: 200, globalComponent: GlobalStub }],
    });
    extensionRegistry.register('b', {
      userSessionBlocks: [{ id: 'early', label: 'Early', order: 10, globalComponent: GlobalStub }],
    });
    extensionRegistry.register('c', {
      userSessionBlocks: [{ id: 'default', label: 'Default', globalComponent: GlobalStub }],
    });

    const ids = extensionRegistry.getUserSessionGlobalBlocks().map((b) => b.id);
    expect(ids).toEqual(['early', 'default', 'late']);
  });
});
