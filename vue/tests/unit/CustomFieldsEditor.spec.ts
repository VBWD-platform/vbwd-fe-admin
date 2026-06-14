import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CustomFieldsEditor from '@/components/CustomFieldsEditor.vue';

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

const defs = [
  { key: 'material', label: 'Material', type: 'text', sort_order: 1 },
  { key: 'weight', label: 'Weight', type: 'number', sort_order: 2 },
  { key: 'in_stock', label: 'In stock', type: 'bool', sort_order: 3 },
  { key: 'size', label: 'Size', type: 'select', options: ['S', 'M', 'L'], sort_order: 4 },
];

function mountEditor() {
  return mount(CustomFieldsEditor, {
    props: { entityType: 'shop_product', entityId: 'p1' },
    global: { mocks: { $t: (key: string) => key } },
  });
}

describe('CustomFieldsEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/custom-fields') && url.includes('entity_type=')) {
        return Promise.resolve({ custom_fields: defs });
      }
      return Promise.resolve({ custom_fields: { material: 'cotton' } });
    });
    mockPut.mockResolvedValue({ custom_fields: { material: 'wool' } });
  });

  it('renders the right input per field type', async () => {
    const wrapper = mountEditor();
    await flushPromises();
    expect(wrapper.find('[data-testid="custom-field-input-material"]').attributes('type')).toBe('text');
    expect(wrapper.find('[data-testid="custom-field-input-weight"]').attributes('type')).toBe('number');
    expect(wrapper.find('[data-testid="custom-field-input-in_stock"]').attributes('type')).toBe('checkbox');
    expect(wrapper.find('[data-testid="custom-field-input-size"]').element.tagName).toBe('SELECT');
  });

  it('prefills current values', async () => {
    const wrapper = mountEditor();
    await flushPromises();
    const input = wrapper.find('[data-testid="custom-field-input-material"]')
      .element as HTMLInputElement;
    expect(input.value).toBe('cotton');
  });

  it('PUTs the field values on save', async () => {
    const wrapper = mountEditor();
    await flushPromises();
    await wrapper.find('[data-testid="custom-field-input-material"]').setValue('wool');
    await wrapper.find('[data-testid="custom-fields-save"]').trigger('click');
    await flushPromises();
    expect(mockPut).toHaveBeenCalledTimes(1);
    const [url, body] = mockPut.mock.calls[0];
    expect(url).toBe('/admin/shop_product/p1/custom-fields');
    expect((body as { custom_fields: Record<string, unknown> }).custom_fields.material).toBe('wool');
    expect(wrapper.find('[data-testid="custom-fields-saved"]').exists()).toBe(true);
  });

  it('surfaces a 400 validation error inline', async () => {
    mockPut.mockRejectedValueOnce({
      response: { data: { error: 'Invalid value for field weight' } },
    });
    const wrapper = mountEditor();
    await flushPromises();
    await wrapper.find('[data-testid="custom-fields-save"]').trigger('click');
    await flushPromises();
    const error = wrapper.find('[data-testid="custom-fields-error"]');
    expect(error.exists()).toBe(true);
    expect(error.text()).toContain('Invalid value for field weight');
  });

  it('renders the save action as a design-system button', async () => {
    const wrapper = mountEditor();
    await flushPromises();
    expect(
      wrapper.find('[data-testid="custom-fields-save"]').classes(),
    ).toContain('vbwd-btn');
  });

  it('shows an empty hint when no defs exist', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('entity_type=')) return Promise.resolve({ custom_fields: [] });
      return Promise.resolve({ custom_fields: {} });
    });
    const wrapper = mountEditor();
    await flushPromises();
    expect(wrapper.find('[data-testid="custom-fields-empty"]').exists()).toBe(true);
  });

  it('renders as a self-contained card with a section heading', async () => {
    const wrapper = mountEditor();
    await flushPromises();
    // The root is a separated form-section card so it never collides with the
    // sibling block above/below regardless of host wrapper styling.
    const root = wrapper.find('[data-testid="custom-fields-editor"]');
    expect(root.classes()).toContain('form-section');
    // The title is a proper section heading, not a bare bold label.
    const heading = root.find('h3.custom-fields-title');
    expect(heading.exists()).toBe(true);
    expect(heading.text()).toBe('tagsCustomFields.customFieldsLabel');
  });
});
