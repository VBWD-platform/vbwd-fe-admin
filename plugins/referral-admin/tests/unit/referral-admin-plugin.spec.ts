import { describe, it, expect, beforeEach } from 'vitest';
import { referralAdminPlugin } from '../../index';
import { extensionRegistry } from '@/plugins/extensionRegistry';

describe('referral-admin plugin nav injection', () => {
  beforeEach(() => {
    extensionRegistry.unregister('referral-admin');
  });

  it('injects a "VBWD Referral" item into the Sales section gated on referral.view', () => {
    referralAdminPlugin.activate?.();

    const salesItems = extensionRegistry.getSectionItems('sales');
    const referral = salesItems.find((item) => item.id === 'referral');

    expect(referral).toBeDefined();
    expect(referral?.label).toBe('VBWD Referral');
    expect(referral?.to).toBe('/admin/promotions/referral');
    expect(referral?.requiredPermission).toBe('referral.view');
    // Positioned adjacent to the discount-admin Promotions group.
    expect(referral?.position).toBe('after:promotions');
  });

  it('deactivate removes the injection', () => {
    referralAdminPlugin.activate?.();
    referralAdminPlugin.deactivate?.();
    const salesItems = extensionRegistry.getSectionItems('sales');
    expect(salesItems.find((item) => item.id === 'referral')).toBeUndefined();
  });
});
