import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import TagPicker from '@/components/TagPicker.vue';

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: vi.fn(),
  },
}));

function mountPicker() {
  return mount(TagPicker, {
    props: { entityType: 'shop_product', entityId: 'p1' },
    global: { mocks: { $t: (key: string) => key } },
  });
}

describe('TagPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // /admin/tags catalog, then /admin/shop_product/p1/tags current
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/tags') {
        return Promise.resolve({
          tags: [
            { slug: 'featured', name: 'Featured', parent_entity_type: null },
            { slug: 'sale', name: 'Sale', parent_entity_type: 'shop_product' },
            { slug: 'blog-only', name: 'Blog only', parent_entity_type: 'cms_post' },
          ],
        });
      }
      return Promise.resolve({ tags: ['featured'] });
    });
    mockPut.mockResolvedValue({ tags: ['featured', 'sale'] });
  });

  it('shows the current entity tags as chips', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    const chips = wrapper.findAll('[data-testid="tag-picker-chip"]');
    expect(chips).toHaveLength(1);
    expect(chips[0].text()).toContain('Featured');
  });

  it('quicksearch filters the catalog to applicable tags (global + this entity_type)', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    await wrapper.find('[data-testid="tag-picker-input"]').setValue('sa');
    const options = wrapper
      .findAll('[data-testid="tag-picker-option"]')
      .map((option) => option.text());
    // "Sale" (shop_product) matches; "blog-only" (cms_post) is never applicable.
    expect(options.some((text) => text.includes('Sale'))).toBe(true);
    expect(options.some((text) => text.includes('Blog only'))).toBe(false);
  });

  it('choosing an existing tag adds it as a chip and PUTs the full set on save', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    await wrapper.find('[data-testid="tag-picker-input"]').setValue('Sale');
    await wrapper.find('[data-testid="tag-picker-option"]').trigger('mousedown');
    expect(wrapper.findAll('[data-testid="tag-picker-chip"]')).toHaveLength(2);

    await wrapper.find('[data-testid="tag-picker-save"]').trigger('click');
    await flushPromises();
    expect(mockPut).toHaveBeenCalledWith('/admin/shop_product/p1/tags', {
      tags: ['featured', 'sale'],
    });
    expect(wrapper.find('[data-testid="tag-picker-saved"]').exists()).toBe(true);
  });

  it('typing a new name offers a create option that creates the tag and applies it', async () => {
    mockPost.mockResolvedValue({
      tag: { slug: 'brand-new', name: 'Brand New', parent_entity_type: 'shop_product' },
    });
    const wrapper = mountPicker();
    await flushPromises();
    await wrapper.find('[data-testid="tag-picker-input"]').setValue('Brand New');
    const createOption = wrapper.find('[data-testid="tag-picker-create"]');
    expect(createOption.exists()).toBe(true);
    expect(createOption.text()).toContain('Brand New');

    await createOption.trigger('mousedown');
    await flushPromises();
    // The new tag is created scoped to this entity type, then selected.
    expect(mockPost).toHaveBeenCalledWith('/admin/tags', {
      slug: 'brand-new',
      name: 'Brand New',
      parent_entity_type: 'shop_product',
    });
    const chips = wrapper.findAll('[data-testid="tag-picker-chip"]').map((chip) => chip.text());
    expect(chips.some((text) => text.includes('Brand New'))).toBe(true);
  });

  it('does not offer create when the typed name matches an existing applicable tag', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    await wrapper.find('[data-testid="tag-picker-input"]').setValue('Sale');
    expect(wrapper.find('[data-testid="tag-picker-create"]').exists()).toBe(false);
  });

  it('removes a tag from the set', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    await wrapper.find('[data-testid="tag-picker-remove-featured"]').trigger('click');
    expect(wrapper.findAll('[data-testid="tag-picker-chip"]')).toHaveLength(0);
  });

  it('renders the save action as a design-system button', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    // fe-core Button renders the shared .vbwd-btn class on its root <button>;
    // the data-testid must still land on that same element.
    expect(
      wrapper.find('[data-testid="tag-picker-save"]').classes(),
    ).toContain('vbwd-btn');
  });

  it('renders as a self-contained card with a section heading', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    const root = wrapper.find('[data-testid="tag-picker"]');
    expect(root.classes()).toContain('form-section');
    const heading = root.find('h3.tag-picker-title');
    expect(heading.exists()).toBe(true);
    expect(heading.text()).toBe('tagsCustomFields.tagsLabel');
  });
});
