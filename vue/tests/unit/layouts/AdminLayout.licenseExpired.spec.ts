import { describe, it, expect, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import AdminLayout from '@/layouts/AdminLayout.vue';
import { useLicenseStore } from '@/stores/license';

/**
 * The admin layout renders a prominent, theme-aware "License expired" banner
 * over the content area whenever the CMS admin API has been license-blocked
 * (a 402 on a `/admin/cms/...` call flips the store flag). It stays out of the
 * way while nothing is blocked.
 */
function mountLayout() {
  return shallowMount(AdminLayout, {
    global: {
      stubs: {
        AdminSidebar: true,
        AdminTopbar: true,
        RouterView: true,
        RouterLink: {
          template: '<a><slot /></a>',
        },
      },
    },
  });
}

describe('AdminLayout — License expired banner', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('does NOT show the banner when nothing is license-blocked', () => {
    const wrapper = mountLayout();
    expect(wrapper.find('[data-testid="license-expired-banner"]').exists()).toBe(false);
  });

  it('shows the "License expired" banner when CMS is license-blocked', async () => {
    const wrapper = mountLayout();
    const store = useLicenseStore();

    store.markLicenseBlocked('cms');
    await wrapper.vm.$nextTick();

    const banner = wrapper.find('[data-testid="license-expired-banner"]');
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain('License expired');
  });
});
