/**
 * Unit tests for ExtensionRegistry — Sprint 05: Extensible Admin Sidebar
 * TDD-first: tests written before buildSidebar() implementation.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { extensionRegistry } from '@/plugins/extensionRegistry'
import type { NavSection } from '@/plugins/extensionRegistry'

const coreSections: NavSection[] = [
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { label: 'Users', to: '/admin/users', id: 'users' },
      { label: 'Invoices', to: '/admin/invoices', id: 'invoices' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { label: 'Settings', to: '/admin/settings', id: 'settings' },
      { label: 'Payment Methods', to: '/admin/payment-methods', id: 'payment-methods' },
    ],
  },
]

describe('ExtensionRegistry — sectionItems', () => {
  beforeEach(() => {
    extensionRegistry.clear()
  })

  it('returns items for matching section id', () => {
    extensionRegistry.register('sub-admin', {
      sectionItems: {
        sales: [{ label: 'Subscriptions', to: '/admin/subscriptions' }],
      },
    })
    const items = extensionRegistry.getSectionItems('sales')
    expect(items).toHaveLength(1)
    expect(items[0].label).toBe('Subscriptions')
  })

  it('returns empty array when no items for section', () => {
    extensionRegistry.register('sub-admin', {
      sectionItems: {
        sales: [{ label: 'Subscriptions', to: '/admin/subscriptions' }],
      },
    })
    expect(extensionRegistry.getSectionItems('settings')).toHaveLength(0)
  })

  it('merges items from multiple plugins', () => {
    extensionRegistry.register('plugin-a', {
      sectionItems: { sales: [{ label: 'A', to: '/admin/a' }] },
    })
    extensionRegistry.register('plugin-b', {
      sectionItems: { sales: [{ label: 'B', to: '/admin/b' }] },
    })
    const items = extensionRegistry.getSectionItems('sales')
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.label)).toEqual(['A', 'B'])
  })

  it('preserves position hints', () => {
    extensionRegistry.register('sub-admin', {
      sectionItems: {
        sales: [{ label: 'Subscriptions', to: '/admin/subscriptions', position: 'before:invoices' }],
      },
    })
    const items = extensionRegistry.getSectionItems('sales')
    expect(items[0].position).toBe('before:invoices')
  })
})

describe('ExtensionRegistry — hiddenItems', () => {
  beforeEach(() => {
    extensionRegistry.clear()
  })

  it('returns hidden paths', () => {
    extensionRegistry.register('free-tier', {
      hiddenItems: ['/admin/payment-methods'],
    })
    expect(extensionRegistry.getHiddenItems()).toContain('/admin/payment-methods')
  })

  it('returns empty when no hidden items', () => {
    extensionRegistry.register('plugin', {})
    expect(extensionRegistry.getHiddenItems()).toHaveLength(0)
  })

  it('merges hidden from multiple plugins', () => {
    extensionRegistry.register('a', { hiddenItems: ['/admin/a'] })
    extensionRegistry.register('b', { hiddenItems: ['/admin/b'] })
    const hidden = extensionRegistry.getHiddenItems()
    expect(hidden).toContain('/admin/a')
    expect(hidden).toContain('/admin/b')
  })
})

describe('ExtensionRegistry — buildSidebar', () => {
  beforeEach(() => {
    extensionRegistry.clear()
  })

  it('returns core sections when no plugins registered', () => {
    const result = extensionRegistry.buildSidebar(coreSections)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('sales')
    expect(result[0].items).toHaveLength(2)
  })

  it('does not modify original core array', () => {
    extensionRegistry.register('sub', {
      sectionItems: { sales: [{ label: 'Sub', to: '/admin/sub' }] },
    })
    extensionRegistry.buildSidebar(coreSections)
    expect(coreSections[0].items).toHaveLength(2) // unchanged
  })

  it('injects items at end of matching section by default', () => {
    extensionRegistry.register('sub', {
      sectionItems: { sales: [{ label: 'Subscriptions', to: '/admin/subscriptions' }] },
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    const sales = result.find((s) => s.id === 'sales')!
    expect(sales.items).toHaveLength(3)
    expect(sales.items[2].label).toBe('Subscriptions')
  })

  it('position before:target inserts before target item', () => {
    extensionRegistry.register('sub', {
      sectionItems: {
        sales: [{ label: 'Subscriptions', to: '/admin/subscriptions', position: 'before:invoices' }],
      },
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    const sales = result.find((s) => s.id === 'sales')!
    const labels = sales.items.map((i) => i.label)
    expect(labels).toEqual(['Users', 'Subscriptions', 'Invoices'])
  })

  it('position after:target inserts after target item', () => {
    extensionRegistry.register('sub', {
      sectionItems: {
        sales: [{ label: 'Subscriptions', to: '/admin/subscriptions', position: 'after:users' }],
      },
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    const sales = result.find((s) => s.id === 'sales')!
    const labels = sales.items.map((i) => i.label)
    expect(labels).toEqual(['Users', 'Subscriptions', 'Invoices'])
  })

  it('position start prepends to section', () => {
    extensionRegistry.register('sub', {
      sectionItems: {
        sales: [{ label: 'First', to: '/admin/first', position: 'start' }],
      },
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    const sales = result.find((s) => s.id === 'sales')!
    expect(sales.items[0].label).toBe('First')
  })

  it('filters hidden items from core sections', () => {
    extensionRegistry.register('free', {
      hiddenItems: ['/admin/payment-methods'],
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    const settings = result.find((s) => s.id === 'settings')!
    expect(settings.items.map((i) => i.to)).not.toContain('/admin/payment-methods')
    expect(settings.items).toHaveLength(1)
  })

  it('appends plugin navSections after core sections', () => {
    extensionRegistry.register('booking', {
      navSections: [
        { id: 'bookings', label: 'Bookings', items: [{ label: 'All', to: '/admin/booking' }] },
      ],
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    expect(result).toHaveLength(3)
    expect(result[2].id).toBe('bookings')
  })

  it('ignores unknown section ids without crashing', () => {
    extensionRegistry.register('plugin', {
      sectionItems: { nonexistent: [{ label: 'X', to: '/x' }] },
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    expect(result).toHaveLength(2) // core only
  })

  it('preserves children on injected items (Level 2)', () => {
    extensionRegistry.register('booking', {
      navSections: [
        {
          id: 'bookings',
          label: 'Bookings',
          items: [
            {
              label: 'Integrations',
              to: '/admin/booking/integrations',
              children: [
                { label: 'Agoda', to: '/admin/booking/integrations/agoda' },
                { label: 'Airbnb', to: '/admin/booking/integrations/airbnb' },
              ],
            },
          ],
        },
      ],
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    const bookings = result.find((s) => s.id === 'bookings')!
    expect(bookings.items[0].children).toHaveLength(2)
    expect(bookings.items[0].children![0].label).toBe('Agoda')
  })

  it('position child:target nests the item as an L2 child of the target', () => {
    extensionRegistry.register('discount', {
      sectionItems: {
        sales: [
          {
            label: 'Promotions',
            to: '/admin/promotions/discounts',
            id: 'promotions',
            children: [
              { label: 'Discounts', to: '/admin/promotions/discounts' },
              { label: 'Coupons', to: '/admin/promotions/coupons' },
            ],
          },
        ],
      },
    })
    extensionRegistry.register('referral', {
      sectionItems: {
        sales: [
          {
            label: 'Referral',
            to: '/admin/promotions/referral',
            id: 'referral',
            position: 'child:promotions',
          },
        ],
      },
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    const sales = result.find((s) => s.id === 'sales')!
    const promotions = sales.items.find((i) => i.id === 'promotions')!
    // Referral nests as the 3rd child, not as a sibling under Sales.
    expect(promotions.children!.map((c) => c.label)).toEqual(['Discounts', 'Coupons', 'Referral'])
    expect(sales.items.find((i) => i.id === 'referral')).toBeUndefined()
  })

  it('child nesting works regardless of plugin registration order', () => {
    // Register the child BEFORE its parent group.
    extensionRegistry.register('referral', {
      sectionItems: {
        sales: [
          { label: 'Referral', to: '/admin/promotions/referral', id: 'referral', position: 'child:promotions' },
        ],
      },
    })
    extensionRegistry.register('discount', {
      sectionItems: {
        sales: [
          {
            label: 'Promotions',
            to: '/admin/promotions/discounts',
            id: 'promotions',
            children: [{ label: 'Discounts', to: '/admin/promotions/discounts' }],
          },
        ],
      },
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    const sales = result.find((s) => s.id === 'sales')!
    const promotions = sales.items.find((i) => i.id === 'promotions')!
    expect(promotions.children!.map((c) => c.label)).toEqual(['Discounts', 'Referral'])
  })

  it('child:target falls back to a sibling when the target is absent', () => {
    extensionRegistry.register('referral', {
      sectionItems: {
        sales: [
          { label: 'Referral', to: '/admin/promotions/referral', id: 'referral', position: 'child:promotions' },
        ],
      },
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    const sales = result.find((s) => s.id === 'sales')!
    expect(sales.items.find((i) => i.id === 'referral')).toBeDefined()
  })

  it('merges settingsItems into settings section (backward compat)', () => {
    extensionRegistry.register('email', {
      settingsItems: [{ label: 'Email', to: '/admin/email' }],
    })
    const result = extensionRegistry.buildSidebar(coreSections)
    const settings = result.find((s) => s.id === 'settings')!
    expect(settings.items.map((i) => i.label)).toContain('Email')
  })
})
