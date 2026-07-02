import { describe, it, expect, beforeEach } from 'vitest';
import { marketplaceAdminPlugin } from '../../index';
import { extensionRegistry } from '@/plugins/extensionRegistry';

describe('marketplace plugin nav section', () => {
  beforeEach(() => {
    extensionRegistry.unregister('marketplace');
  });

  it('registers a standalone "Marketplace" nav section with Vendors + Withdraw requests', () => {
    marketplaceAdminPlugin.activate?.();

    const section = extensionRegistry
      .getNavSections()
      .find((navSection) => navSection.id === 'marketplace');

    expect(section).toBeDefined();
    expect(section?.label).toBe('Marketplace');

    const vendors = section?.items.find((item) => item.id === 'marketplace-vendors');
    expect(vendors?.label).toBe('Vendors');
    expect(vendors?.to).toBe('/admin/marketplace/vendors');
    expect(vendors?.requiredPermission).toBe('marketplace.manage');

    const withdraw = section?.items.find(
      (item) => item.id === 'marketplace-withdraw-requests',
    );
    expect(withdraw?.label).toBe('Withdraw requests');
    expect(withdraw?.to).toBe('/admin/marketplace/withdraw-requests');
  });

  it('deactivate removes the section', () => {
    marketplaceAdminPlugin.activate?.();
    marketplaceAdminPlugin.deactivate?.();
    const section = extensionRegistry
      .getNavSections()
      .find((navSection) => navSection.id === 'marketplace');
    expect(section).toBeUndefined();
  });
});
