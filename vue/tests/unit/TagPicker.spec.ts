import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import TagPicker from '@/components/TagPicker.vue';

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: vi.fn(),
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

  it('offers only applicable tags (global + this entity_type)', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    const optionValues = wrapper
      .find('[data-testid="tag-picker-select"]')
      .findAll('option')
      .map((option) => option.attributes('value'));
    // current "featured" is selected so it's excluded from add list; "sale"
    // (scoped to shop_product) is offered; "blog-only" (cms_post) is hidden.
    expect(optionValues).toContain('sale');
    expect(optionValues).not.toContain('blog-only');
  });

  it('shows the current entity tags as chips', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    const chips = wrapper.findAll('[data-testid="tag-picker-chip"]');
    expect(chips).toHaveLength(1);
    expect(chips[0].text()).toContain('Featured');
  });

  it('adds a tag and saves the full set via PUT', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    await wrapper.find('[data-testid="tag-picker-select"]').setValue('sale');
    await wrapper.find('[data-testid="tag-picker-add-btn"]').trigger('click');
    expect(wrapper.findAll('[data-testid="tag-picker-chip"]')).toHaveLength(2);

    await wrapper.find('[data-testid="tag-picker-save"]').trigger('click');
    await flushPromises();
    expect(mockPut).toHaveBeenCalledWith('/admin/shop_product/p1/tags', {
      tags: ['featured', 'sale'],
    });
    expect(wrapper.find('[data-testid="tag-picker-saved"]').exists()).toBe(true);
  });

  it('removes a tag from the set', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    await wrapper.find('[data-testid="tag-picker-remove-featured"]').trigger('click');
    expect(wrapper.findAll('[data-testid="tag-picker-chip"]')).toHaveLength(0);
  });

  it('renders the add/save actions as design-system buttons', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    // fe-core Button renders the shared .vbwd-btn class on its root <button>;
    // the data-testid must still land on that same element.
    expect(
      wrapper.find('[data-testid="tag-picker-add-btn"]').classes(),
    ).toContain('vbwd-btn');
    expect(
      wrapper.find('[data-testid="tag-picker-save"]').classes(),
    ).toContain('vbwd-btn');
  });

  it('renders as a self-contained card with a section heading', async () => {
    const wrapper = mountPicker();
    await flushPromises();
    // The root is a separated form-section card so it never collides with the
    // sibling block above/below regardless of host wrapper styling.
    const root = wrapper.find('[data-testid="tag-picker"]');
    expect(root.classes()).toContain('form-section');
    // The title is a proper section heading, not a bare bold label.
    const heading = root.find('h3.tag-picker-title');
    expect(heading.exists()).toBe(true);
    expect(heading.text()).toBe('tagsCustomFields.tagsLabel');
  });
});
