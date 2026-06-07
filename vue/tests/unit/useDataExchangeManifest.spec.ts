/**
 * S46.4 — useDataExchangeManifest composable.
 *
 * Single home (DRY) for fetching the perm-filtered data-exchange manifest once
 * and deriving per-entity `can_export` / `can_import` / `can_export_pii` flags
 * for the list controls. Unknown entities default to all-false (hidden).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const getJson = vi.fn();

vi.mock('@/api/dataExchangeApi', () => ({
  createDataExchangeApi: () => ({
    getJson: (...args: unknown[]) => getJson(...args),
    postForBlob: vi.fn(),
    postFormForJson: vi.fn(),
  }),
}));

import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';

const MANIFEST = [
  {
    entity_key: 'users',
    label: 'Users',
    cluster: 'sales',
    supported_formats: ['json', 'csv'],
    supports_export: true,
    supports_import: true,
    can_export: true,
    can_import: false,
    can_export_pii: true,
  },
  {
    entity_key: 'invoices',
    label: 'Invoices',
    cluster: 'sales',
    supported_formats: ['json'],
    supports_export: true,
    supports_import: false,
    can_export: true,
    can_import: false,
    can_export_pii: false,
  },
];

describe('useDataExchangeManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the manifest and exposes capabilities per entity', async () => {
    getJson.mockResolvedValue(MANIFEST);
    const { load, capabilitiesFor } = useDataExchangeManifest();

    await load();

    expect(getJson).toHaveBeenCalledWith('/admin/data-exchange/manifest');
    expect(capabilitiesFor('users')).toMatchObject({
      can_export: true,
      can_import: false,
      can_export_pii: true,
      supported_formats: ['json', 'csv'],
    });
    expect(capabilitiesFor('invoices').can_import).toBe(false);
  });

  it('returns all-false capabilities for unknown / unpermitted entities', async () => {
    getJson.mockResolvedValue(MANIFEST);
    const { load, capabilitiesFor } = useDataExchangeManifest();
    await load();

    expect(capabilitiesFor('payment_methods')).toMatchObject({
      can_export: false,
      can_import: false,
      can_export_pii: false,
    });
  });

  it('accepts the { entities: [...] } envelope shape', async () => {
    getJson.mockResolvedValue({ entities: MANIFEST });
    const { load, capabilitiesFor } = useDataExchangeManifest();
    await load();
    expect(capabilitiesFor('users').can_export).toBe(true);
  });

  it('does not throw if the manifest request fails (controls stay hidden)', async () => {
    getJson.mockRejectedValue(new Error('403'));
    const { load, capabilitiesFor } = useDataExchangeManifest();

    await expect(load()).resolves.toBeUndefined();
    expect(capabilitiesFor('users').can_export).toBe(false);
  });
});
