import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { ImportExportControls } from 'vbwd-view-component';
import CurrenciesTab from '@/views/tax-countries/CurrenciesTab.vue';
import { api } from '@/api';
import { configureAuthStore, useAuthStore } from '@/stores/auth';
import type { Currency } from '@/stores/currencies';

vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
  initializeApi: vi.fn(),
  clearApiAuth: vi.fn(),
}));

function makeCurrency(overrides: Partial<Currency>): Currency {
  return {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    exchange_rate: 1,
    decimal_places: 2,
    is_active: true,
    is_default: true,
    ...overrides,
  };
}

// EUR default (1.0) + USD 1.08 + GBP 0.85 active; JPY inactive.
function defaultCatalog(): Currency[] {
  return [
    makeCurrency({ code: 'EUR', exchange_rate: 1, is_active: true, is_default: true }),
    makeCurrency({ code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 1.08, is_active: true, is_default: false }),
    makeCurrency({ code: 'GBP', name: 'Pound', symbol: '£', exchange_rate: 0.85, is_active: true, is_default: false }),
    makeCurrency({ code: 'JPY', name: 'Yen', symbol: '¥', exchange_rate: 160, is_active: false, is_default: false }),
  ];
}

let crossRateBase = 'default';

function installApiMocks(catalog: Currency[]): void {
  crossRateBase = 'default';
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/admin/currencies') return Promise.resolve({ currencies: catalog });
    if (url === '/admin/settings') {
      return Promise.resolve({ settings: { cross_rate_base: crossRateBase } });
    }
    if (url === '/admin/data-exchange/manifest') {
      return Promise.resolve({
        entities: [
          {
            entity_key: 'currencies',
            can_export: true,
            can_import: true,
            can_export_pii: false,
            supported_formats: ['json', 'csv'],
          },
        ],
      });
    }
    return Promise.resolve({});
  });
  vi.mocked(api.post).mockImplementation((url: string) => {
    if (url === '/admin/currencies') {
      return Promise.resolve({
        currency: makeCurrency({ code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', exchange_rate: 1.05, is_active: false, is_default: false }),
      });
    }
    return Promise.resolve({ currencies: catalog });
  });
  vi.mocked(api.delete).mockResolvedValue({ currencies: catalog });
  vi.mocked(api.put).mockImplementation((url: string) => {
    if (url === '/admin/settings') {
      const lastBody = vi.mocked(api.put).mock.calls.find((call) => call[0] === '/admin/settings')?.[1] as
        | { cross_rate_base?: string }
        | undefined;
      if (lastBody?.cross_rate_base) crossRateBase = lastBody.cross_rate_base;
      return Promise.resolve({});
    }
    if (url.endsWith('/rate')) {
      return Promise.resolve({ currency: makeCurrency({ code: 'GBP', is_default: false, exchange_rate: 0.85 }) });
    }
    return Promise.resolve({});
  });
}

function mountTab() {
  return mount(CurrenciesTab);
}

async function mountReady() {
  const wrapper = mountTab();
  await flushPromises();
  return wrapper;
}

function setSuperAdmin(): void {
  configureAuthStore({
    storageKey: 'test_token',
    apiClient: api as Parameters<typeof configureAuthStore>[0]['apiClient'],
  });
  const authStore = useAuthStore();
  authStore.$patch({
    user: { id: '1', email: 'admin@test.com', role: 'SUPER_ADMIN', permissions: ['*'] },
    token: 'test-token',
  });
}

describe('CurrenciesTab.vue (S84)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setSuperAdmin();
    vi.clearAllMocks();
    installApiMocks(defaultCatalog());
  });

  describe('Block 1 — active / available selector', () => {
    it('lists active currencies in the active list and inactive in the available list', async () => {
      const wrapper = await mountReady();
      expect(api.get).toHaveBeenCalledWith('/admin/currencies');
      const activeList = wrapper.find('[data-testid="currency-active-list"]');
      const availableList = wrapper.find('[data-testid="currency-available-list"]');
      expect(activeList.text()).toContain('EUR');
      expect(activeList.text()).toContain('USD');
      expect(activeList.text()).toContain('GBP');
      expect(availableList.text()).toContain('JPY');
      expect(availableList.text()).not.toContain('EUR');
    });

    it('quick-search filters the available list', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-search"]').setValue('jp');
      const availableList = wrapper.find('[data-testid="currency-available-list"]');
      expect(availableList.text()).toContain('JPY');
    });

    it('moving available -> active calls activate(code)', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-activate-JPY"]').trigger('click');
      await flushPromises();
      expect(api.post).toHaveBeenCalledWith('/admin/currencies/JPY/activate');
    });

    it('moving active -> available calls deactivate(code)', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-deactivate-GBP"]').trigger('click');
      await flushPromises();
      expect(api.post).toHaveBeenCalledWith('/admin/currencies/GBP/deactivate');
    });

    it('the default currency cannot be deactivated (no deactivate control)', async () => {
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="currency-deactivate-EUR"]').exists()).toBe(false);
    });
  });

  describe('Block 2 — default currency selector', () => {
    it('binds the select to the current default', async () => {
      const wrapper = await mountReady();
      const select = wrapper.find('[data-testid="currency-default-select"]');
      expect((select.element as HTMLSelectElement).value).toBe('EUR');
    });

    it('only lists active currencies as default options', async () => {
      const wrapper = await mountReady();
      const options = wrapper
        .find('[data-testid="currency-default-select"]')
        .findAll('option')
        .map((option) => (option.element as HTMLOptionElement).value);
      expect(options).toEqual(['EUR', 'USD', 'GBP']);
    });

    it('changing the select (confirmed) calls setDefault(code) and refetches', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountReady();
      vi.mocked(api.get).mockClear();
      await wrapper.find('[data-testid="currency-default-select"]').setValue('USD');
      await flushPromises();
      expect(api.post).toHaveBeenCalledWith('/admin/currencies/USD/set-default');
      expect(api.get).toHaveBeenCalledWith('/admin/currencies');
    });

    it('cancelling the confirm does not call setDefault', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-default-select"]').setValue('USD');
      await flushPromises();
      expect(api.post).not.toHaveBeenCalledWith('/admin/currencies/USD/set-default');
    });
  });

  describe('Block 3 — cross-rate base switcher', () => {
    it('loads cross_rate_base from /admin/settings', async () => {
      const wrapper = await mountReady();
      expect(api.get).toHaveBeenCalledWith('/admin/settings');
      const select = wrapper.find('[data-testid="currency-base-switch"]');
      expect((select.element as HTMLSelectElement).value).toBe('default');
    });

    it('saves the changed base to /admin/settings', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-base-switch"]').setValue('usd');
      await flushPromises();
      expect(api.put).toHaveBeenCalledWith(
        '/admin/settings',
        expect.objectContaining({ cross_rate_base: 'usd' }),
      );
    });

    it('disables the USD option when USD is not active', async () => {
      const catalog = defaultCatalog().map((currency) =>
        currency.code === 'USD' ? { ...currency, is_active: false } : currency,
      );
      installApiMocks(catalog);
      const wrapper = await mountReady();
      const usdOption = wrapper
        .find('[data-testid="currency-base-switch"]')
        .findAll('option')
        .find((option) => (option.element as HTMLOptionElement).value === 'usd');
      expect((usdOption?.element as HTMLOptionElement).disabled).toBe(true);
    });

    it('flipping to USD adds the <DEFAULT>USD row (EURUSD)', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-base-switch"]').setValue('usd');
      await flushPromises();
      expect(wrapper.find('[data-testid="currency-rate-EUR"]').exists()).toBe(true);
    });
  });

  describe('Block 4 — editable rate sheet math', () => {
    it('base=default: GBPEUR row shows 0.85', async () => {
      const wrapper = await mountReady();
      const gbpInput = wrapper.find('[data-testid="currency-rate-GBP"]');
      expect(Number((gbpInput.element as HTMLInputElement).value)).toBeCloseTo(0.85, 7);
    });

    it('base=USD: GBPUSD = 0.85/1.08 and EURUSD = 1.08', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-base-switch"]').setValue('usd');
      await flushPromises();
      const gbpInput = wrapper.find('[data-testid="currency-rate-GBP"]');
      const eurInput = wrapper.find('[data-testid="currency-rate-EUR"]');
      expect(Number((gbpInput.element as HTMLInputElement).value)).toBeCloseTo(0.85 / 1.08, 7);
      expect(Number((eurInput.element as HTMLInputElement).value)).toBeCloseTo(1.08, 7);
    });
  });

  describe('Block 4 — single general Save button', () => {
    it('renders exactly one save control and no per-row save buttons', async () => {
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="currency-rates-save-all"]').exists()).toBe(true);
      const perRowSaves = wrapper
        .findAll('button')
        .filter((button) => (button.attributes('data-testid') ?? '').startsWith('currency-rate-save-'));
      expect(perRowSaves).toHaveLength(0);
    });

    it('the save button is disabled with no edits and enabled after an edit', async () => {
      const wrapper = await mountReady();
      const saveAll = wrapper.find('[data-testid="currency-rates-save-all"]');
      expect((saveAll.element as HTMLButtonElement).disabled).toBe(true);
      await wrapper.find('[data-testid="currency-rate-GBP"]').setValue('0.9');
      expect((saveAll.element as HTMLButtonElement).disabled).toBe(false);
    });

    it('base=default: editing two rows PUTs both, leaves unchanged rows un-PUT, refetches once, clears dirty', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-rate-GBP"]').setValue('0.9');
      await wrapper.find('[data-testid="currency-rate-USD"]').setValue('1.2');
      vi.mocked(api.get).mockClear();
      vi.mocked(api.put).mockClear();
      await wrapper.find('[data-testid="currency-rates-save-all"]').trigger('click');
      await flushPromises();
      const ratePuts = vi
        .mocked(api.put)
        .mock.calls.filter((entry) => (entry[0] as string).endsWith('/rate'));
      expect(ratePuts).toHaveLength(2);
      expect(api.put).toHaveBeenCalledWith('/admin/currencies/GBP/rate', { exchange_rate: 0.9 });
      expect(api.put).toHaveBeenCalledWith('/admin/currencies/USD/rate', { exchange_rate: 1.2 });
      const getCurrencyCalls = vi
        .mocked(api.get)
        .mock.calls.filter((entry) => entry[0] === '/admin/currencies');
      expect(getCurrencyCalls).toHaveLength(1);
      // dirty cleared -> button disabled again
      expect(
        (wrapper.find('[data-testid="currency-rates-save-all"]').element as HTMLButtonElement)
          .disabled,
      ).toBe(true);
    });

    it('does not PUT unchanged rows', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-rate-GBP"]').setValue('0.9');
      await wrapper.find('[data-testid="currency-rates-save-all"]').trigger('click');
      await flushPromises();
      expect(api.put).not.toHaveBeenCalledWith('/admin/currencies/USD/rate', expect.anything());
    });

    it('base=USD: editing GBPUSD and EURUSD saves default-relative rates (v*1.08 and v)', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-base-switch"]').setValue('usd');
      await flushPromises();
      await wrapper.find('[data-testid="currency-rate-GBP"]').setValue('0.8');
      await wrapper.find('[data-testid="currency-rate-EUR"]').setValue('1.1');
      await wrapper.find('[data-testid="currency-rates-save-all"]').trigger('click');
      await flushPromises();
      const gbpCall = vi
        .mocked(api.put)
        .mock.calls.find((entry) => entry[0] === '/admin/currencies/GBP/rate');
      const usdCall = vi
        .mocked(api.put)
        .mock.calls.find((entry) => entry[0] === '/admin/currencies/USD/rate');
      expect(gbpCall).toBeTruthy();
      expect((gbpCall?.[1] as { exchange_rate: number }).exchange_rate).toBeCloseTo(0.8 * 1.08, 7);
      expect(usdCall).toBeTruthy();
      expect((usdCall?.[1] as { exchange_rate: number }).exchange_rate).toBeCloseTo(1.1, 7);
    });

    it('a per-row failure still saves the others and surfaces the message', async () => {
      const wrapper = await mountReady();
      vi.mocked(api.put).mockImplementation((url: string) => {
        if (url === '/admin/currencies/GBP/rate') {
          return Promise.reject(new Error('GBP boom'));
        }
        if (url.endsWith('/rate')) {
          return Promise.resolve({ currency: makeCurrency({ code: 'USD', is_default: false, exchange_rate: 1.2 }) });
        }
        return Promise.resolve({});
      });
      await wrapper.find('[data-testid="currency-rate-GBP"]').setValue('0.9');
      await wrapper.find('[data-testid="currency-rate-USD"]').setValue('1.2');
      await wrapper.find('[data-testid="currency-rates-save-all"]').trigger('click');
      await flushPromises();
      expect(api.put).toHaveBeenCalledWith('/admin/currencies/USD/rate', { exchange_rate: 1.2 });
      const message = wrapper.find('[data-testid="currency-error-message"]');
      expect(message.exists()).toBe(true);
      expect(message.text()).toContain('GBP');
    });
  });

  describe('Block 4 — accuracy (<= 1e-7)', () => {
    it('flipping base default->USD->default reproduces every stored rate within 1e-7', async () => {
      const wrapper = await mountReady();
      const base = wrapper.find('[data-testid="currency-base-switch"]');
      const originalGbp = Number(
        (wrapper.find('[data-testid="currency-rate-GBP"]').element as HTMLInputElement).value,
      );
      await base.setValue('usd');
      await flushPromises();
      await base.setValue('default');
      await flushPromises();
      const roundTrippedGbp = Number(
        (wrapper.find('[data-testid="currency-rate-GBP"]').element as HTMLInputElement).value,
      );
      expect(Math.abs(roundTrippedGbp - originalGbp)).toBeLessThan(1e-7);
      expect(Math.abs(roundTrippedGbp - 0.85)).toBeLessThan(1e-7);
    });
  });

  describe('Block 4 — validation', () => {
    it('does not save a non-positive rate', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-rate-GBP"]').setValue('0');
      await wrapper.find('[data-testid="currency-rates-save-all"]').trigger('click');
      await flushPromises();
      expect(api.put).not.toHaveBeenCalledWith(
        '/admin/currencies/GBP/rate',
        expect.anything(),
      );
    });
  });

  describe('Add currency', () => {
    it('renders an "Add currency" button on the active block', async () => {
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="currency-add-btn"]').exists()).toBe(true);
    });

    it('the add form is hidden until the button is clicked', async () => {
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="currency-new-code"]').exists()).toBe(false);
      await wrapper.find('[data-testid="currency-add-btn"]').trigger('click');
      expect(wrapper.find('[data-testid="currency-new-code"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="currency-new-name"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="currency-new-symbol"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="currency-new-decimals"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="currency-new-rate"]').exists()).toBe(true);
    });

    it('defaults decimals to 2 and rate to 1', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-add-btn"]').trigger('click');
      expect((wrapper.find('[data-testid="currency-new-decimals"]').element as HTMLInputElement).value).toBe('2');
      expect((wrapper.find('[data-testid="currency-new-rate"]').element as HTMLInputElement).value).toBe('1');
    });

    it('cancel closes the form without posting', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-add-btn"]').trigger('click');
      await wrapper.find('[data-testid="currency-new-cancel"]').trigger('click');
      expect(wrapper.find('[data-testid="currency-new-code"]').exists()).toBe(false);
      expect(api.post).not.toHaveBeenCalledWith('/admin/currencies', expect.anything());
    });

    it('submitting a valid currency POSTs the payload and refetches', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-add-btn"]').trigger('click');
      await wrapper.find('[data-testid="currency-new-code"]').setValue('CHF');
      await wrapper.find('[data-testid="currency-new-name"]').setValue('Swiss Franc');
      await wrapper.find('[data-testid="currency-new-symbol"]').setValue('Fr');
      await wrapper.find('[data-testid="currency-new-rate"]').setValue('1.05');
      vi.mocked(api.get).mockClear();
      await wrapper.find('[data-testid="currency-new-submit"]').trigger('click');
      await flushPromises();
      expect(api.post).toHaveBeenCalledWith('/admin/currencies', {
        code: 'CHF',
        name: 'Swiss Franc',
        symbol: 'Fr',
        decimal_places: 2,
        exchange_rate: 1.05,
      });
      expect(api.get).toHaveBeenCalledWith('/admin/currencies');
    });

    it('rejects a malformed code client-side (no POST)', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-add-btn"]').trigger('click');
      await wrapper.find('[data-testid="currency-new-code"]').setValue('eu');
      await wrapper.find('[data-testid="currency-new-name"]').setValue('X');
      await wrapper.find('[data-testid="currency-new-symbol"]').setValue('x');
      await wrapper.find('[data-testid="currency-new-submit"]').trigger('click');
      await flushPromises();
      expect(api.post).not.toHaveBeenCalledWith('/admin/currencies', expect.anything());
      expect(wrapper.find('[data-testid="currency-error-message"]').exists()).toBe(true);
    });

    it('rejects a non-positive rate client-side (no POST)', async () => {
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-add-btn"]').trigger('click');
      await wrapper.find('[data-testid="currency-new-code"]').setValue('CHF');
      await wrapper.find('[data-testid="currency-new-name"]').setValue('Swiss Franc');
      await wrapper.find('[data-testid="currency-new-symbol"]').setValue('Fr');
      await wrapper.find('[data-testid="currency-new-rate"]').setValue('0');
      await wrapper.find('[data-testid="currency-new-submit"]').trigger('click');
      await flushPromises();
      expect(api.post).not.toHaveBeenCalledWith('/admin/currencies', expect.anything());
      expect(wrapper.find('[data-testid="currency-error-message"]').exists()).toBe(true);
    });

    it('surfaces a backend duplicate (400) error', async () => {
      const wrapper = await mountReady();
      vi.mocked(api.post).mockImplementation((url: string) => {
        if (url === '/admin/currencies') {
          return Promise.reject(new Error('Currency code already exists'));
        }
        return Promise.resolve({ currencies: defaultCatalog() });
      });
      await wrapper.find('[data-testid="currency-add-btn"]').trigger('click');
      await wrapper.find('[data-testid="currency-new-code"]').setValue('USD');
      await wrapper.find('[data-testid="currency-new-name"]').setValue('US Dollar');
      await wrapper.find('[data-testid="currency-new-symbol"]').setValue('$');
      await wrapper.find('[data-testid="currency-new-submit"]').trigger('click');
      await flushPromises();
      const message = wrapper.find('[data-testid="currency-error-message"]');
      expect(message.exists()).toBe(true);
      expect(message.text()).toContain('already exists');
    });
  });

  describe('Delete currency', () => {
    it('renders a delete icon on each AVAILABLE (inactive) currency only', async () => {
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="currency-delete-JPY"]').exists()).toBe(true);
    });

    it('renders NO delete control on active currencies', async () => {
      const wrapper = await mountReady();
      expect(wrapper.find('[data-testid="currency-delete-EUR"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="currency-delete-USD"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="currency-delete-GBP"]').exists()).toBe(false);
    });

    it('confirmed delete calls deleteCurrency(code) and refetches', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountReady();
      vi.mocked(api.get).mockClear();
      await wrapper.find('[data-testid="currency-delete-JPY"]').trigger('click');
      await flushPromises();
      expect(api.delete).toHaveBeenCalledWith('/admin/currencies/JPY');
      expect(api.get).toHaveBeenCalledWith('/admin/currencies');
    });

    it('cancelling the confirm does not delete', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const wrapper = await mountReady();
      await wrapper.find('[data-testid="currency-delete-JPY"]').trigger('click');
      await flushPromises();
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('surfaces a backend 400 (active/default) message', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const wrapper = await mountReady();
      vi.mocked(api.delete).mockRejectedValue(new Error('Cannot delete an active currency'));
      await wrapper.find('[data-testid="currency-delete-JPY"]').trigger('click');
      await flushPromises();
      const message = wrapper.find('[data-testid="currency-error-message"]');
      expect(message.exists()).toBe(true);
      expect(message.text()).toContain('active');
    });
  });

  describe('Import / export (D6)', () => {
    it('renders exactly one ImportExportControls scoped to currencies', async () => {
      const wrapper = await mountReady();
      const controls = wrapper.findAllComponents(ImportExportControls);
      expect(controls).toHaveLength(1);
      const props = controls[0].props() as Record<string, unknown>;
      expect(props.entityKey).toBe('currencies');
    });

    it('exposes json + csv export formats', async () => {
      const wrapper = await mountReady();
      const controls = wrapper.findComponent(ImportExportControls);
      const props = controls.props() as Record<string, unknown>;
      expect(props.supportedFormats).toEqual(['json', 'csv']);
    });

    it('export routes through POST /admin/data-exchange/currencies/export', async () => {
      vi.mocked(api.post).mockResolvedValue(new Blob());
      const wrapper = await mountReady();
      await wrapper.find('[data-test="export-all"]').trigger('click');
      await flushPromises();
      const call = vi
        .mocked(api.post)
        .mock.calls.find((entry) => entry[0] === '/admin/data-exchange/currencies/export');
      expect(call).toBeTruthy();
    });

    it('hides the control when the manifest denies currencies', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/admin/currencies') return Promise.resolve({ currencies: defaultCatalog() });
        if (url === '/admin/settings') return Promise.resolve({ settings: { cross_rate_base: 'default' } });
        if (url === '/admin/data-exchange/manifest') return Promise.resolve({ entities: [] });
        return Promise.resolve({});
      });
      const wrapper = await mountReady();
      expect(wrapper.findComponent(ImportExportControls).exists()).toBe(false);
    });
  });
});
