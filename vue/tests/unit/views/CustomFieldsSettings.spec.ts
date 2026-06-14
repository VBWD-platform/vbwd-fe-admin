import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CustomFieldsSettings from '@/views/CustomFieldsSettings.vue';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: vi.fn(),
  },
}));

vi.mock('@/api/dataExchangeApi', () => ({
  createDataExchangeApi: () => ({
    getJson: vi.fn(),
    postForBlob: vi.fn(),
    postFormForJson: vi.fn(),
  }),
}));

const entityTypes = [
  { entity_type: 'user', label: 'User', manage_permission: 'users.manage' },
  { entity_type: 'shop_product', label: 'Product', manage_permission: 'shop.manage' },
];

const customFields = [
  { id: 'cf1', entity_type: 'shop_product', key: 'material', label: 'Material', type: 'text', options: null, sort_order: 1, is_active: true },
  { id: 'cf2', entity_type: 'user', key: 'vip', label: 'VIP', type: 'bool', options: null, sort_order: 2, is_active: true },
];

const tags = [
  { id: 't1', slug: 'featured', name: 'Featured', parent_entity_type: null, meta_data: {}, color: null, stats: 7 },
  { id: 't2', slug: 'sale', name: 'Sale', parent_entity_type: 'shop_product', meta_data: {}, color: null, stats: 3 },
];

function setupGet() {
  mockGet.mockImplementation((url: string) => {
    if (url.includes('custom-field-entity-types')) return Promise.resolve({ entity_types: entityTypes });
    if (url.startsWith('/admin/custom-fields')) return Promise.resolve({ custom_fields: customFields });
    if (url.startsWith('/admin/tags')) return Promise.resolve({ tags });
    return Promise.resolve({});
  });
}

function mountPage() {
  return mount(CustomFieldsSettings, {
    global: {
      plugins: [createPinia()],
      stubs: { ImportExportControls: true },
      mocks: { $t: (key: string) => key },
    },
  });
}

describe('CustomFieldsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    setupGet();
    mockPost.mockResolvedValue({});
    mockPut.mockResolvedValue({});
  });

  it('renders both tabs and the custom-fields table by default', async () => {
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find('[data-testid="tab-custom-fields"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tab-global-tags"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="cf-row"]')).toHaveLength(2);
  });

  it('quick-searches custom fields client-side', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('[data-testid="cf-quick-search"]').setValue('material');
    expect(wrapper.findAll('[data-testid="cf-row"]')).toHaveLength(1);
  });

  it('reloads custom fields with the entity filter', async () => {
    const wrapper = mountPage();
    await flushPromises();
    mockGet.mockClear();
    setupGet();
    await wrapper.find('[data-testid="cf-filter-entity"]').setValue('shop_product');
    await flushPromises();
    expect(
      mockGet.mock.calls.some(([url]) => String(url).includes('entity_type=shop_product')),
    ).toBe(true);
  });

  it('bulk-deletes selected custom fields', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('[data-testid="cf-select-cf1"]').setValue(true);
    await wrapper.find('[data-testid="cf-bulk-delete"]').trigger('click');
    await flushPromises();
    expect(mockPost).toHaveBeenCalledWith('/admin/custom-fields/bulk-delete', { ids: ['cf1'] });
  });

  it('creates a custom field', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('[data-testid="cf-create-btn"]').trigger('click');
    await wrapper.find('[data-testid="cf-form-key"]').setValue('color');
    await wrapper.find('[data-testid="cf-form-label"]').setValue('Color');
    await wrapper.find('[data-testid="cf-form-entity"]').setValue('shop_product');
    await wrapper.find('[data-testid="cf-create-form"]').trigger('submit');
    await flushPromises();
    expect(mockPost).toHaveBeenCalledWith(
      '/admin/custom-fields',
      expect.objectContaining({ key: 'color', label: 'Color', entity_type: 'shop_product' }),
    );
  });

  it('renders the tag stats column from the list endpoint', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('[data-testid="tab-global-tags"]').trigger('click');
    const statCells = wrapper.findAll('[data-testid="tag-stats"]');
    expect(statCells.map((cell) => cell.text())).toEqual(['7', '3']);
  });

  it('quick-searches tags and bulk-deletes them', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('[data-testid="tab-global-tags"]').trigger('click');
    await wrapper.find('[data-testid="tag-quick-search"]').setValue('sale');
    expect(wrapper.findAll('[data-testid="tag-row"]')).toHaveLength(1);

    await wrapper.find('[data-testid="tag-select-sale"]').setValue(true);
    await wrapper.find('[data-testid="tag-bulk-delete"]').trigger('click');
    await flushPromises();
    expect(mockPost).toHaveBeenCalledWith('/admin/tags/bulk-delete', { slugs: ['sale'] });
  });

  it('renders toolbar and form actions as design-system buttons', async () => {
    const wrapper = mountPage();
    await flushPromises();
    // Create / bulk action buttons route through the fe-core Button (.vbwd-btn)
    // while preserving their data-testids.
    expect(
      wrapper.find('[data-testid="cf-create-btn"]').classes(),
    ).toContain('vbwd-btn');
    expect(
      wrapper.find('[data-testid="cf-bulk-delete"]').classes(),
    ).toContain('vbwd-btn');
    await wrapper.find('[data-testid="tab-global-tags"]').trigger('click');
    expect(
      wrapper.find('[data-testid="tag-create-btn"]').classes(),
    ).toContain('vbwd-btn');
  });

  it('filters tags by parent entity type', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('[data-testid="tab-global-tags"]').trigger('click');
    mockGet.mockClear();
    setupGet();
    await wrapper.find('[data-testid="tag-filter-parent"]').setValue('shop_product');
    await flushPromises();
    expect(
      mockGet.mock.calls.some(([url]) => String(url).includes('parent_entity_type=shop_product')),
    ).toBe(true);
  });
});
