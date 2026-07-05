import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ProductTypeFieldValues from '../../src/components/ProductTypeFieldValues.vue';
import type { ProductTypeField } from '../../src/stores/productTypeAdmin';

function field(overrides: Partial<ProductTypeField>): ProductTypeField {
  return {
    slug: 'field',
    type: 'string',
    label: 'Field',
    required: false,
    options: [],
    help: null,
    sort_order: 0,
    ...overrides,
  };
}

describe('ProductTypeFieldValues.vue', () => {
  it('renders one input per field ordered by sort_order', () => {
    const fields: ProductTypeField[] = [
      field({ slug: 'strength', label: 'Strength', sort_order: 2 }),
      field({ slug: 'atc_code', label: 'ATC code', sort_order: 1 }),
    ];

    const wrapper = mount(ProductTypeFieldValues, {
      props: { fields, modelValue: {} },
    });

    const groups = wrapper.findAll('[data-testid^="type-field-group-"]');
    expect(groups).toHaveLength(2);
    // atc_code (sort_order 1) renders before strength (sort_order 2)
    expect(groups[0].attributes('data-testid')).toBe('type-field-group-atc_code');
    expect(groups[1].attributes('data-testid')).toBe('type-field-group-strength');
  });

  it('renders the right control per field type', () => {
    const fields: ProductTypeField[] = [
      field({ slug: 'name', type: 'string' }),
      field({ slug: 'notes', type: 'textarea' }),
      field({ slug: 'leaflet', type: 'url' }),
      field({ slug: 'count', type: 'integer' }),
      field({ slug: 'ratio', type: 'decimal' }),
      field({ slug: 'is_rx', type: 'boolean' }),
      field({ slug: 'klass', type: 'select', options: ['RX', 'OTC'] }),
      field({ slug: 'substances', type: 'multiselect', options: ['A', 'B'] }),
    ];

    const wrapper = mount(ProductTypeFieldValues, {
      props: { fields, modelValue: {} },
    });

    expect(wrapper.find('[data-testid="type-field-name"]').element.tagName).toBe('INPUT');
    expect(wrapper.find('[data-testid="type-field-notes"]').element.tagName).toBe('TEXTAREA');
    expect(
      (wrapper.find('[data-testid="type-field-leaflet"]').element as HTMLInputElement).type,
    ).toBe('url');
    expect(
      (wrapper.find('[data-testid="type-field-count"]').element as HTMLInputElement).type,
    ).toBe('number');
    expect(
      (wrapper.find('[data-testid="type-field-is_rx"]').element as HTMLInputElement).type,
    ).toBe('checkbox');
    expect(wrapper.find('[data-testid="type-field-klass"]').element.tagName).toBe('SELECT');
    // multiselect renders a checkbox per option
    expect(wrapper.find('[data-testid="type-field-substances-A"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="type-field-substances-B"]').exists()).toBe(true);
  });

  it('shows the field label, help text and a required marker', () => {
    const fields: ProductTypeField[] = [
      field({ slug: 'atc_code', label: 'ATC code', required: true, help: 'WHO code' }),
    ];

    const wrapper = mount(ProductTypeFieldValues, {
      props: { fields, modelValue: {} },
    });

    const group = wrapper.find('[data-testid="type-field-group-atc_code"]');
    expect(group.text()).toContain('ATC code');
    expect(group.text()).toContain('WHO code');
    expect(group.find('[data-testid="type-field-required-atc_code"]').exists()).toBe(true);
  });

  it('hydrates control values from modelValue', () => {
    const fields: ProductTypeField[] = [
      field({ slug: 'atc_code', type: 'string' }),
      field({ slug: 'klass', type: 'select', options: ['RX', 'OTC'] }),
    ];

    const wrapper = mount(ProductTypeFieldValues, {
      props: { fields, modelValue: { atc_code: 'N02BE01', klass: 'OTC' } },
    });

    expect(
      (wrapper.find('[data-testid="type-field-atc_code"]').element as HTMLInputElement).value,
    ).toBe('N02BE01');
    expect(
      (wrapper.find('[data-testid="type-field-klass"]').element as HTMLSelectElement).value,
    ).toBe('OTC');
  });

  it('emits update:modelValue with the changed value keyed by slug', async () => {
    const fields: ProductTypeField[] = [field({ slug: 'atc_code', type: 'string' })];

    const wrapper = mount(ProductTypeFieldValues, {
      props: { fields, modelValue: {} },
    });

    await wrapper.find('[data-testid="type-field-atc_code"]').setValue('N02BE01');

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[emitted.length - 1][0]).toEqual({ atc_code: 'N02BE01' });
  });

  it('toggles multiselect options into an array value', async () => {
    const fields: ProductTypeField[] = [
      field({ slug: 'substances', type: 'multiselect', options: ['A', 'B'] }),
    ];

    const wrapper = mount(ProductTypeFieldValues, {
      props: { fields, modelValue: {} },
    });

    await wrapper.find('[data-testid="type-field-substances-A"]').setValue(true);

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted?.[emitted.length - 1][0]).toEqual({ substances: ['A'] });
  });
});
