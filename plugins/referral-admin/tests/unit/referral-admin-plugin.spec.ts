import { describe, it, expect, beforeEach } from 'vitest';
import { referralAdminPlugin } from '../../index';
import { extensionRegistry } from '@/plugins/extensionRegistry';

describe('referral-admin plugin nav injection', () => {
  beforeEach(() => {
    extensionRegistry.unregister('referral-admin');
  });

  it('injects a "Referral" item into the Sales section gated on referral.view', () => {
    referralAdminPlugin.activate?.();

    const salesItems = extensionRegistry.getSectionItems('sales');
    const referral = salesItems.find((item) => item.id === 'referral');

    expect(referral).toBeDefined();
    expect(referral?.label).toBe('Referral');
    expect(referral?.to).toBe('/admin/promotions/referral');
    expect(referral?.requiredPermission).toBe('referral.view');
    // Nested as a child of the discount-admin Promotions group.
    expect(referral?.position).toBe('child:promotions');
  });

  it('deactivate removes the injection', () => {
    referralAdminPlugin.activate?.();
    referralAdminPlugin.deactivate?.();
    const salesItems = extensionRegistry.getSectionItems('sales');
    expect(salesItems.find((item) => item.id === 'referral')).toBeUndefined();
  });
});
